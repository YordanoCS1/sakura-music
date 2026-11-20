use std::path::{Path, PathBuf};
use std::time::Duration;

use rusqlite::{Connection, OptionalExtension, Row, params};
use serde::Serialize;

use crate::{logging, paths, scanner::ScannedTrack};

#[derive(Clone)]
pub struct ScanEntry {
    pub track: ScannedTrack,
    pub modified_ns: i64,
}

pub(crate) const TRACK_COLUMNS: &str = "id, path, title, artist, album, album_artist, track_number, \
    duration, duration_str, format, bitrate_kbps, cover_url, year, genre, file_size, modified_ns";

/// Carpeta raíz de la biblioteca activa, usada para validar scope y borrados.
pub fn root_path() -> Result<String, String> {
    let connection = open_connection()?;
    root_desde(&connection)
}

fn root_desde(connection: &Connection) -> Result<String, String> {
    connection
        .query_row(
            "SELECT value FROM library_state WHERE key = 'root_path'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("No se pudo consultar la biblioteca activa: {}", error))?
        .ok_or_else(|| "No hay una carpeta de biblioteca activa".to_string())
}

pub(crate) fn open_connection() -> Result<Connection, String> {
    let path = paths::library_db_file();
    let parent = path
        .parent()
        .ok_or_else(|| "No se pudo resolver la carpeta de la base de datos".to_string())?;
    std::fs::create_dir_all(parent)
        .map_err(|error| format!("No se pudo crear la carpeta de datos: {}", error))?;

    let connection = Connection::open(path)
        .map_err(|error| format!("No se pudo abrir la base de datos de biblioteca: {}", error))?;
    // El vigilante de carpetas y la UI pueden escribir a la vez; sin este
    // tiempo de espera SQLite devolvería "database is locked" al primer cruce.
    connection
        .busy_timeout(Duration::from_secs(5))
        .map_err(|error| format!("No se pudo configurar SQLite: {}", error))?;
    // WAL (que se fija al crear el esquema) + synchronous=NORMAL es la
    // combinación recomendada para una app local: sigue siendo durable ante
    // un cierre de la app, pero no espera un fsync en cada escritura.
    // temp_store=MEMORY evita archivos temporales en las ordenaciones grandes.
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .and_then(|_| connection.pragma_update(None, "synchronous", "NORMAL"))
        .and_then(|_| connection.pragma_update(None, "temp_store", "MEMORY"))
        .map_err(|error| format!("No se pudo optimizar SQLite: {}", error))?;
    Ok(connection)
}

pub(crate) fn create_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            // WAL permite leer la biblioteca mientras el escáner escribe, sin
            // bloquear la interfaz durante el reescaneo.
            "PRAGMA journal_mode = WAL;
             CREATE TABLE IF NOT EXISTS library_tracks (
                 id TEXT NOT NULL,
                 path TEXT PRIMARY KEY NOT NULL,
                 title TEXT NOT NULL,
                 artist TEXT NOT NULL,
                 album TEXT NOT NULL,
                 album_artist TEXT,
                 track_number INTEGER,
                 duration INTEGER NOT NULL,
                 duration_str TEXT NOT NULL,
                 format TEXT NOT NULL,
                 bitrate_kbps INTEGER,
                 cover_url TEXT,
                 year INTEGER,
                 genre TEXT,
                 file_size INTEGER NOT NULL,
                 modified_ns INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS library_state (
                 key TEXT PRIMARY KEY NOT NULL,
                 value TEXT NOT NULL
             );
              CREATE TABLE IF NOT EXISTS app_meta (
                 key TEXT PRIMARY KEY NOT NULL,
                 value TEXT NOT NULL
             );
              -- Playlists: la posición ordena y la FK limpia al borrar la lista.
              CREATE TABLE IF NOT EXISTS playlists (
                 id TEXT PRIMARY KEY NOT NULL,
                 name TEXT NOT NULL,
                 created_at INTEGER NOT NULL
              );
              CREATE TABLE IF NOT EXISTS playlist_tracks (
                 playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
                 path TEXT NOT NULL,
                 position INTEGER NOT NULL,
                 PRIMARY KEY (playlist_id, path)
              );
              CREATE INDEX IF NOT EXISTS playlist_tracks_orden
                 ON playlist_tracks(playlist_id, position);
              -- Papelera: guarda el archivo y los datos de la pista para Deshacer.
              CREATE TABLE IF NOT EXISTS deleted_tracks (
                 token TEXT PRIMARY KEY NOT NULL,
                 original_path TEXT NOT NULL,
                 trash_path TEXT NOT NULL,
                 track_json TEXT NOT NULL,
                 deleted_at INTEGER NOT NULL
              );
             CREATE VIRTUAL TABLE IF NOT EXISTS library_fts USING fts5(
                 title, artist, album,
                 content='library_tracks',
                 content_rowid='rowid',
                 tokenize='unicode61 remove_diacritics 2'
             );
             CREATE TRIGGER IF NOT EXISTS library_fts_ai AFTER INSERT ON library_tracks BEGIN
                 INSERT INTO library_fts(rowid, title, artist, album)
                 VALUES (new.rowid, new.title, new.artist, new.album);
             END;
             CREATE TRIGGER IF NOT EXISTS library_fts_ad AFTER DELETE ON library_tracks BEGIN
                 INSERT INTO library_fts(library_fts, rowid, title, artist, album)
                 VALUES ('delete', old.rowid, old.title, old.artist, old.album);
             END;
             CREATE TRIGGER IF NOT EXISTS library_fts_au AFTER UPDATE ON library_tracks BEGIN
                 INSERT INTO library_fts(library_fts, rowid, title, artist, album)
                 VALUES ('delete', old.rowid, old.title, old.artist, old.album);
                 INSERT INTO library_fts(rowid, title, artist, album)
                 VALUES (new.rowid, new.title, new.artist, new.album);
             END;
             -- Índices para los filtros y agrupaciones de la biblioteca; sin
             -- ellos cada cambio de artista o álbum recorre toda la tabla.
             CREATE INDEX IF NOT EXISTS library_idx_artist
                 ON library_tracks(artist COLLATE NOCASE);
             CREATE INDEX IF NOT EXISTS library_idx_album
                 ON library_tracks(album COLLATE NOCASE);
             CREATE INDEX IF NOT EXISTS library_idx_year
                 ON library_tracks(year);
             CREATE INDEX IF NOT EXISTS library_idx_genre
                 ON library_tracks(genre COLLATE NOCASE);",
        )
        .map_err(|error| format!("No se pudo inicializar SQLite: {}", error))
}

pub(crate) fn upsert_on(connection: &Connection, entry: &ScanEntry) -> Result<(), rusqlite::Error> {
    let track = &entry.track;
    let sql = format!(
        "INSERT INTO library_tracks ({TRACK_COLUMNS}) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
         )
         ON CONFLICT(path) DO UPDATE SET
            id=excluded.id, title=excluded.title, artist=excluded.artist,
            album=excluded.album, album_artist=excluded.album_artist,
            track_number=excluded.track_number, duration=excluded.duration,
            duration_str=excluded.duration_str, format=excluded.format,
            bitrate_kbps=excluded.bitrate_kbps, cover_url=excluded.cover_url,
            year=excluded.year, genre=excluded.genre, file_size=excluded.file_size,
            modified_ns=excluded.modified_ns"
    );
    connection.execute(
        &sql,
        params![
            track.id,
            track.path,
            track.title,
            track.artist,
            track.album,
            track.album_artist,
            track.track_number.map(i64::from),
            track.duration as i64,
            track.duration_str,
            track.format,
            track.bitrate_kbps.map(i64::from),
            track.cover_url,
            track.year.map(i64::from),
            track.genre,
            track.file_size as i64,
            entry.modified_ns,
        ],
    )?;
    Ok(())
}

pub(crate) fn read_entry(row: &Row<'_>) -> rusqlite::Result<ScanEntry> {
    let track_number: Option<i64> = row.get(6)?;
    let bitrate: Option<i64> = row.get(10)?;
    let year: Option<i64> = row.get(12)?;
    Ok(ScanEntry {
        track: ScannedTrack {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            album_artist: row.get(5)?,
            track_number: track_number.map(|value| value.max(0) as u32),
            duration: row.get::<_, i64>(7)?.max(0) as u64,
            duration_str: row.get(8)?,
            format: row.get(9)?,
            bitrate_kbps: bitrate.map(|value| value.max(0) as u32),
            cover_url: row.get(11)?,
            year: year.map(|value| value.max(0) as u32),
            genre: row.get(13)?,
            file_size: row.get::<_, i64>(14)?.max(0) as u64,
        },
        modified_ns: row.get(15)?,
    })
}

fn insert_legacy_cache(connection: &mut Connection) -> Result<(), String> {
    let imported: Option<String> = connection
        .query_row(
            "SELECT value FROM app_meta WHERE key = 'legacy_json_imported'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("No se pudo consultar la migración de biblioteca: {}", error))?;
    if imported.is_some() {
        return Ok(());
    }

    let legacy_file = paths::cache_file();
    if legacy_file.exists() {
        match std::fs::read_to_string(&legacy_file) {
            Ok(data) => match serde_json::from_str::<Vec<ScannedTrack>>(&data) {
                Ok(tracks) => {
                    let transaction = connection
                        .transaction()
                        .map_err(|error| error.to_string())?;
                    for track in tracks {
                        upsert_on(
                            &transaction,
                            &ScanEntry {
                                track,
                                modified_ns: 0,
                            },
                        )
                        .map_err(|error| format!("No se pudo importar la biblioteca: {}", error))?;
                    }
                    transaction
                        .commit()
                        .map_err(|error| format!("No se pudo confirmar la migración: {}", error))?;
                }
                Err(error) => crate::logging::warn(
                    "library_db",
                    &format!(
                        "No se pudo importar {} a SQLite; se conserva el archivo original: {}",
                        legacy_file.display(),
                        error
                    ),
                ),
            },
            Err(error) => crate::logging::warn(
                "library_db",
                &format!(
                    "No se pudo leer la caché anterior {}: {}",
                    legacy_file.display(),
                    error
                ),
            ),
        }
    }

    connection
        .execute(
            "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('legacy_json_imported', '1')",
            [],
        )
        .map_err(|error| format!("No se pudo registrar la migración: {}", error))?;
    Ok(())
}

/// Versión del esquema. Cada cambio estructural sube este número y se
/// documenta en `MIGRACIONES`; `PRAGMA user_version` lo persiste en la base.
const USER_VERSION_ACTUAL: i32 = 2;

/// 1: tablas base + índice FTS5 + disparadores de mantenimiento.
/// 2: índices en artista, álbum, año y género.
const MIGRACIONES: &str = "1=FTS5 y disparadores · 2=índices de filtro";

pub fn initialize() -> Result<(), String> {
    let mut connection = open_connection()?;
    let version: i32 = connection
        .query_row("PRAGMA user_version", [], |fila| fila.get(0))
        .map_err(|error| format!("No se pudo leer la versión de la base: {}", error))?;

    // Antes de tocar nada se guarda una copia consistente. VACUUM INTO funciona
    // con WAL activo: a diferencia de copiar el archivo, incluye los últimos
    // commits. Si algo sale mal en una migración, el usuario tiene una copia.
    if version < USER_VERSION_ACTUAL {
        crear_backup(&connection, "auto")?;
    }

    let tenia_fts: bool = connection
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'library_fts'",
            [],
            |_| Ok(true),
        )
        .optional()
        .map_err(|error| format!("No se pudo verificar el indice de busqueda: {}", error))?
        .unwrap_or(false);
    create_schema(&connection)?;
    if !tenia_fts {
        connection
            .execute("INSERT INTO library_fts(library_fts) VALUES('rebuild')", [])
            .map_err(|error| format!("No se pudo construir el indice de busqueda: {}", error))?;
    }

    connection
        .pragma_update(None, "user_version", USER_VERSION_ACTUAL)
        .map_err(|error| format!("No se pudo registrar la migración: {}", error))?;
    logging::info(
        "library_db",
        &format!("Base lista: versión {version} → {USER_VERSION_ACTUAL} ({MIGRACIONES})"),
    );
    insert_legacy_cache(&mut connection)
}

pub fn cached_tracks() -> Result<Vec<ScanEntry>, String> {
    let connection = open_connection()?;
    read_tracks(&connection)
}

fn read_tracks(connection: &Connection) -> Result<Vec<ScanEntry>, String> {
    let sql = format!("SELECT {TRACK_COLUMNS} FROM library_tracks ORDER BY title COLLATE NOCASE");
    let mut statement = connection
        .prepare(&sql)
        .map_err(|error| format!("No se pudo consultar la biblioteca: {}", error))?;
    let rows = statement
        .query_map([], read_entry)
        .map_err(|error| format!("No se pudo consultar la biblioteca: {}", error))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudo leer la biblioteca: {}", error))
}

/// Convierte la consulta del usuario en una expresión MATCH de FTS5.
/// Cada palabra se busca como prefijo y entre comillas: así un guion o un
/// acento no rompen la consulta y "guren" encuentra "Gurenge".
fn consulta_fts(query: &str) -> String {
    query
        .split_whitespace()
        .map(|palabra| {
            palabra
                .chars()
                .filter(|c| c.is_alphanumeric())
                .collect::<String>()
        })
        .filter(|palabra| !palabra.is_empty())
        .map(|palabra| format!("\"{palabra}\"*"))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Búsqueda full-text sobre título, artista y álbum usando el índice FTS5.
pub fn search_tracks_on(
    connection: &Connection,
    query: &str,
    limit: usize,
) -> Result<Vec<ScannedTrack>, String> {
    let expresion = consulta_fts(query);
    if expresion.is_empty() {
        return Ok(Vec::new());
    }
    let sql = "SELECT t.* FROM library_tracks t
               JOIN library_fts ON library_fts.rowid = t.rowid
               WHERE library_fts MATCH ?1
               ORDER BY bm25(library_fts, 2.0, 1.5, 1.0), t.title COLLATE NOCASE
               LIMIT ?2";
    let mut sentencia = connection
        .prepare(sql)
        .map_err(|error| format!("No se pudo preparar la búsqueda: {}", error))?;
    let filas = sentencia
        .query_map(params![expresion, limit as i64], |row| {
            read_entry(row).map(|entrada| entrada.track)
        })
        .map_err(|error| format!("No se pudo buscar en la biblioteca: {}", error))?;
    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudo leer la búsqueda: {}", error))
}

/// Busca una pista por ID (usado por el control remoto).
pub fn track_by_id(id: &str) -> Result<Option<ScannedTrack>, String> {
    let connection = open_connection()?;
    let sql = format!("SELECT {TRACK_COLUMNS} FROM library_tracks WHERE id = ?1");
    connection
        .query_row(&sql, params![id], |row| read_entry(row).map(|e| e.track))
        .optional()
        .map_err(|error| format!("No se pudo buscar la pista: {}", error))
}

pub fn search_tracks(query: &str, limit: usize) -> Result<Vec<ScannedTrack>, String> {
    let connection = open_connection()?;
    search_tracks_on(&connection, query, limit)
}

pub fn sync_scan(root: &Path, entries: &[ScanEntry]) -> Result<(), String> {
    let mut connection = open_connection()?;
    sync_scan_on(&mut connection, root, entries)
}

fn sync_scan_on(
    connection: &mut Connection,
    root: &Path,
    entries: &[ScanEntry],
) -> Result<(), String> {
    let transaction = connection.transaction().map_err(|error| {
        format!(
            "No se pudo iniciar la actualización de biblioteca: {}",
            error
        )
    })?;
    let root_path = root.to_string_lossy().to_string();
    let previous_root: Option<String> = transaction
        .query_row(
            "SELECT value FROM library_state WHERE key = 'root_path'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("No se pudo consultar la biblioteca activa: {}", error))?;

    if previous_root.as_deref() != Some(root_path.as_str()) {
        transaction
            .execute("DELETE FROM library_tracks", [])
            .map_err(|error| format!("No se pudo reemplazar la biblioteca: {}", error))?;
    } else {
        let current_paths: std::collections::HashSet<&str> = entries
            .iter()
            .map(|entry| entry.track.path.as_str())
            .collect();
        let mut statement = transaction
            .prepare("SELECT path FROM library_tracks")
            .map_err(|error| format!("No se pudo preparar la actualización: {}", error))?;
        let existing_paths = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|error| format!("No se pudo leer la biblioteca anterior: {}", error))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("No se pudo leer la biblioteca anterior: {}", error))?;
        drop(statement);
        for path in existing_paths {
            if !current_paths.contains(path.as_str()) {
                transaction
                    .execute("DELETE FROM library_tracks WHERE path = ?1", [path])
                    .map_err(|error| format!("No se pudo quitar una pista ausente: {}", error))?;
            }
        }
    }

    for entry in entries {
        upsert_on(&transaction, entry)
            .map_err(|error| format!("No se pudo guardar una pista en la biblioteca: {}", error))?;
    }
    transaction
        .execute(
            "INSERT OR REPLACE INTO library_state (key, value) VALUES ('root_path', ?1)",
            [&root_path],
        )
        .map_err(|error| format!("No se pudo guardar la carpeta de biblioteca: {}", error))?;
    transaction
        .commit()
        .map_err(|error| format!("No se pudo confirmar el escaneo: {}", error))
}

pub fn upsert_track(track: &ScannedTrack) -> Result<(), String> {
    let modified_ns = std::fs::metadata(&track.path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|modified| modified.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|elapsed| elapsed.as_nanos().min(i64::MAX as u128) as i64)
        .unwrap_or(0);
    let connection = open_connection()?;
    upsert_on(
        &connection,
        &ScanEntry {
            track: track.clone(),
            modified_ns,
        },
    )
    .map_err(|error| format!("No se pudo actualizar la pista en SQLite: {}", error))
}

fn delete_track_on(connection: &Connection, path: &str) -> Result<(), String> {
    let indexed_path: Option<String> = connection
        .query_row(
            "SELECT path FROM library_tracks WHERE path = ?1",
            [path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("No se pudo verificar la canción seleccionada: {}", error))?;
    let indexed_path = indexed_path
        .ok_or_else(|| "La canción ya no pertenece a la biblioteca actual".to_string())?;

    let root_path: Option<String> = connection
        .query_row(
            "SELECT value FROM library_state WHERE key = 'root_path'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("No se pudo verificar la carpeta de biblioteca: {}", error))?;
    let root_path =
        root_path.ok_or_else(|| "No hay una carpeta de biblioteca activa".to_string())?;

    let file_path = Path::new(&indexed_path);
    // `symlink_metadata` detecta también los enlaces simbólicos. Después se
    // comparan las rutas canónicas para que un symlink dentro de la biblioteca
    // no permita borrar un archivo de fuera de ella.
    match std::fs::symlink_metadata(file_path) {
        Ok(_) => {
            validar_scope(&root_path, file_path)?;
            std::fs::remove_file(file_path)
                .map_err(|error| format!("No se pudo borrar el archivo: {}", error))?;
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(format!("No se pudo comprobar el archivo: {}", error)),
    }

    connection
        .execute(
            "DELETE FROM library_tracks WHERE path = ?1",
            [&indexed_path],
        )
        .map_err(|error| {
            format!(
                "El archivo se borró, pero no se pudo actualizar SQLite: {}",
                error
            )
        })?;
    Ok(())
}

/// Importa un conjunto de pistas ya escaneadas (usado por el CLI).
pub fn import_tracks(tracks: &[ScannedTrack]) -> Result<usize, String> {
    let mut connection = open_connection()?;
    let transaccion = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la importación: {}", error))?;
    for track in tracks {
        upsert_on(
            &transaccion,
            &ScanEntry {
                track: track.clone(),
                modified_ns: 0,
            },
        )
        .map_err(|error| format!("No se pudo importar una pista: {}", error))?;
    }
    transaccion
        .commit()
        .map_err(|error| format!("No se pudo confirmar la importación: {}", error))?;
    Ok(tracks.len())
}

/// Chequea la integridad de la base y reconstruye el índice de búsqueda.
pub fn doctor() -> Result<String, String> {
    let connection = open_connection()?;
    let estado: String = connection
        .query_row("PRAGMA integrity_check", [], |fila| fila.get(0))
        .map_err(|error| format!("No se pudo verificar la base: {}", error))?;
    connection
        .execute("INSERT INTO library_fts(library_fts) VALUES('rebuild')", [])
        .map_err(|error| format!("No se pudo reconstruir el índice: {}", error))?;
    let total: i64 = connection
        .query_row("SELECT COUNT(*) FROM library_tracks", [], |fila| {
            fila.get(0)
        })
        .map_err(|error| format!("No se pudo contar las pistas: {}", error))?;
    Ok(format!(
        "integrity={estado} · pistas={total} · índice FTS reconstruido"
    ))
}

/// Mueve el archivo a la papelera y devuelve un token para poder deshacer.
/// El borrado definitivo sólo ocurre desde "Vaciar papelera".
pub fn delete_track(path: &str) -> Result<String, String> {
    let connection = open_connection()?;
    // Leemos la pista ANTES de borrarla: `delete_track_on` quita la fila.
    let entrada = connection
        .query_row(
            &format!("SELECT {TRACK_COLUMNS} FROM library_tracks WHERE path = ?1"),
            [path],
            read_entry,
        )
        .optional()
        .map_err(|error| format!("No se pudo leer la pista antes de borrarla: {}", error))?;
    let Some(entrada) = entrada else {
        return Err("La pista ya no pertenece a la biblioteca actual".to_string());
    };
    delete_track_on(&connection, path)?;

    let token = format!(
        "{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    );
    let extension = Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("audio");
    let destino = paths::trash_dir().join(format!("{token}.{extension}"));
    mover_archivo(Path::new(path), &destino)?;

    connection
        .execute(
            "INSERT INTO deleted_tracks (token, original_path, trash_path, track_json, deleted_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                token,
                path,
                destino.to_string_lossy().to_string(),
                serde_json::to_string(&entrada.track).map_err(|error| format!(
                    "No se pudo guardar la pista en la papelera: {}",
                    error
                ))?,
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0),
            ],
        )
        .map_err(|error| format!("No se pudo registrar el borrado: {}", error))?;
    Ok(token)
}

/// `rename` falla si la papelera está en otra unidad; en ese caso se copia y
/// se borra el original para no perder el archivo.
fn mover_archivo(origen: &Path, destino: &Path) -> Result<(), String> {
    match std::fs::rename(origen, destino) {
        Ok(()) => Ok(()),
        Err(cross) if cross.kind() == std::io::ErrorKind::CrossesDevices => {
            std::fs::copy(origen, destino).map_err(|error| {
                format!("No se pudo copiar el archivo a la papelera: {}", error)
            })?;
            std::fs::remove_file(origen)
                .map_err(|error| format!("No se pudo quitar el archivo original: {}", error))
        }
        Err(error) => Err(format!(
            "No se pudo mover el archivo a la papelera: {}",
            error
        )),
    }
}

#[derive(Serialize)]
pub struct Borrado {
    pub token: String,
    pub title: String,
    pub count: usize,
}

/// Restaura un borrado: vuelve a mover el archivo y reinserta la pista en SQLite.
pub fn restore_deleted_track(token: &str) -> Result<String, String> {
    let connection = open_connection()?;
    let fila: Option<(String, String, String)> = connection
        .query_row(
            "SELECT original_path, trash_path, track_json FROM deleted_tracks WHERE token = ?1",
            [token],
            |fila| Ok((fila.get(0)?, fila.get(1)?, fila.get(2)?)),
        )
        .optional()
        .map_err(|error| format!("No se pudo buscar el borrado: {}", error))?;
    let Some((original, papelera, json)) = fila else {
        return Err("Ese borrado ya no está disponible".to_string());
    };
    let track: ScannedTrack = serde_json::from_str(&json)
        .map_err(|error| format!("No se pudo leer la pista guardada: {}", error))?;
    if let Some(padre) = Path::new(&original).parent() {
        std::fs::create_dir_all(padre)
            .map_err(|error| format!("No se pudo recrear la carpeta original: {}", error))?;
    }
    mover_archivo(Path::new(&papelera), Path::new(&original))?;
    upsert_on(
        &connection,
        &ScanEntry {
            track: track.clone(),
            modified_ns: 0,
        },
    )
    .map_err(|error| format!("No se pudo reinsertar la pista: {}", error))?;
    connection
        .execute("DELETE FROM deleted_tracks WHERE token = ?1", [token])
        .map_err(|error| format!("No se pudo cerrar la restauración: {}", error))?;
    Ok(original)
}

/// Cantidad de borrados pendientes, para mostrar en Ajustes → Sistema.
pub fn trash_count() -> Result<i64, String> {
    let connection = open_connection()?;
    connection
        .query_row("SELECT COUNT(*) FROM deleted_tracks", [], |fila| {
            fila.get(0)
        })
        .map_err(|error| format!("No se pudo contar la papelera: {}", error))
}

/// Borra definitivamente los archivos de la papelera.
pub fn empty_trash() -> Result<usize, String> {
    let connection = open_connection()?;
    let rutas: Vec<String> = connection
        .prepare("SELECT trash_path FROM deleted_tracks")
        .map_err(|error| format!("No se pudo leer la papelera: {}", error))?
        .query_map([], |fila| fila.get(0))
        .map_err(|error| format!("No se pudo leer la papelera: {}", error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudo leer la papelera: {}", error))?;
    for ruta in &rutas {
        let _ = std::fs::remove_file(ruta);
    }
    connection
        .execute("DELETE FROM deleted_tracks", [])
        .map_err(|error| format!("No se pudo vaciar la papelera: {}", error))?;
    Ok(rutas.len())
}

pub fn clear() -> Result<(), String> {
    let connection = open_connection()?;
    connection
        .execute_batch("DELETE FROM library_tracks; DELETE FROM library_state;")
        .map_err(|error| {
            format!(
                "No se pudo limpiar la base de datos de biblioteca: {}",
                error
            )
        })
}

/* ======================================================================== */
/* BACKUPS, DIAGNÓSTICO Y VALIDACIÓN DE SCOPE                                */
/* ======================================================================== */

/// Copia consistente de la base: `VACUUM INTO` incluye los últimos commits
/// aunque haya WAL activo, algo que no pasa con una copia del archivo.
fn crear_backup(connection: &Connection, etiqueta: &str) -> Result<String, String> {
    let version: i32 = connection
        .query_row("PRAGMA user_version", [], |fila| fila.get(0))
        .map_err(|error| format!("No se pudo leer la versión de la base: {}", error))?;
    const NANOS: u128 = 1_000_000_000;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() / NANOS)
        .unwrap_or(0);
    let destino = paths::data_dir().join(format!("library-{etiqueta}-v{version}-{stamp}.bak"));
    let nombre = destino.to_string_lossy().to_string();
    connection
        .execute("VACUUM INTO ?1", params![nombre])
        .map_err(|error| format!("No se pudo crear el respaldo: {}", error))?;
    podar_backups()?;
    logging::info(
        "library_db",
        &format!("Respaldo creado: {}", destino.display()),
    );
    Ok(nombre)
}

/// Sólo se conservan los tres respaldos más recientes para no llenar el disco.
fn podar_backups() -> Result<(), String> {
    let mut respaldos: Vec<PathBuf> = std::fs::read_dir(paths::data_dir())
        .map_err(|error| format!("No se pudo listar los respaldos: {}", error))?
        .flatten()
        .map(|entrada| entrada.path())
        .filter(|ruta| {
            ruta.file_name()
                .and_then(|nombre| nombre.to_str())
                .is_some_and(|nombre| nombre.starts_with("library-") && nombre.ends_with(".bak"))
        })
        .collect();
    respaldos.sort();
    while respaldos.len() > 3 {
        let viejo = respaldos.remove(0);
        let _ = std::fs::remove_file(viejo);
    }
    Ok(())
}

pub fn backup_database() -> Result<String, String> {
    let connection = open_connection()?;
    crear_backup(&connection, "manual")
}

fn tamano_base() -> Result<u64, String> {
    std::fs::metadata(paths::library_db_file())
        .map(|datos| datos.len())
        .map_err(|error| format!("No se pudo medir la base: {}", error))
}

pub fn vacuum_database() -> Result<String, String> {
    let connection = open_connection()?;
    let antes = tamano_base()? / 1024;
    connection
        .execute("VACUUM", [])
        .map_err(|error| format!("No se pudo compactar la base: {}", error))?;
    let despues = tamano_base()? / 1024;
    Ok(format!("Base compactada: {antes} KB → {despues} KB"))
}

#[derive(Serialize)]
pub struct DatabaseInfo {
    pub integridad: String,
    pub pistas: i64,
    pub entradas_fts: i64,
    pub version_esquema: i32,
    pub tamano_bytes: u64,
    pub ultimo_backup: Option<String>,
    pub migraciones: &'static str,
}

pub fn database_info() -> Result<DatabaseInfo, String> {
    let connection = open_connection()?;
    let integridad: String = connection
        .query_row("PRAGMA integrity_check", [], |fila| fila.get(0))
        .map_err(|error| format!("No se pudo verificar la base: {}", error))?;
    let pistas: i64 = connection
        .query_row("SELECT COUNT(*) FROM library_tracks", [], |fila| {
            fila.get(0)
        })
        .map_err(|error| format!("No se pudo contar las pistas: {}", error))?;
    let entradas_fts: i64 = connection
        .query_row("SELECT COUNT(*) FROM library_fts", [], |fila| fila.get(0))
        .unwrap_or(0);
    let version_esquema: i32 = connection
        .query_row("PRAGMA user_version", [], |fila| fila.get(0))
        .map_err(|error| format!("No se pudo leer la versión de la base: {}", error))?;
    let ultimo_backup = std::fs::read_dir(paths::data_dir())
        .ok()
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|entrada| {
            let nombre = entrada.file_name().to_string_lossy().to_string();
            (nombre.starts_with("library-") && nombre.ends_with(".bak")).then_some(nombre)
        })
        .max();
    Ok(DatabaseInfo {
        integridad,
        pistas,
        entradas_fts,
        version_esquema,
        tamano_bytes: tamano_base()?,
        ultimo_backup,
        migraciones: MIGRACIONES,
    })
}

#[derive(Serialize)]
pub struct DoctorResultado {
    pub mensaje: String,
    pub info: DatabaseInfo,
}

/// Verificación completa que expone Ajustes → Sistema. El `doctor()` del CLI
/// sigue devolviendo una línea de texto para no romper el comando existente.
pub fn doctor_detallado() -> Result<DoctorResultado, String> {
    let mensaje = doctor()?;
    Ok(DoctorResultado {
        mensaje,
        info: database_info()?,
    })
}

/// Compara la ruta canónica contra la raíz de la biblioteca. Los enlaces
/// simbólicos se resuelven antes, así un `.lnk` interno no puede apuntar a un
/// archivo de fuera. Es la misma comprobación que ya protegía los borrados;
/// ahora la usan también las escrituras de etiquetas.
fn validar_scope(root: &str, archivo: &Path) -> Result<PathBuf, String> {
    let canonica_raiz = Path::new(root)
        .canonicalize()
        .map_err(|error| format!("No se pudo validar la carpeta de biblioteca: {}", error))?;
    let canonica = archivo
        .canonicalize()
        .map_err(|error| format!("No se pudo validar el archivo: {}", error))?;
    if !canonica.starts_with(&canonica_raiz) {
        return Err("El archivo está fuera de la carpeta de biblioteca activa".to_string());
    }
    if !canonica.is_file() {
        return Err("La ruta seleccionada no es un archivo de audio".to_string());
    }
    Ok(canonica)
}

/// Para los comandos IPC que escriben tags. Rechaza cualquier ruta que no
/// esté dentro de la raíz activa, aunque viniera de un `invoke` manipulado.
pub fn validar_archivo_de_biblioteca(path: &str) -> Result<PathBuf, String> {
    let connection = open_connection()?;
    // Primero, que la pista figure en la biblioteca: un invoke manipulado no
    // puede escribir tags de un archivo que la app nunca escaneó.
    let indizada: bool = connection
        .query_row(
            "SELECT 1 FROM library_tracks WHERE path = ?1",
            [path],
            |_| Ok(true),
        )
        .optional()
        .map_err(|error| format!("No se pudo verificar la pista: {}", error))?
        .unwrap_or(false);
    if !indizada {
        return Err("La pista no pertenece a la biblioteca actual".to_string());
    }
    // Las pistas importadas por CLI no tienen raíz activa: para ésas alcanza
    // con el chequeo de índice. Si hay raíz, se valida el scope canónico.
    match root_desde(&connection).ok() {
        Some(raiz) => validar_scope(&raiz, Path::new(path)),
        None => {
            let canonica = Path::new(path)
                .canonicalize()
                .map_err(|error| format!("No se pudo validar el archivo: {}", error))?;
            if !canonica.is_file() {
                return Err("La ruta seleccionada no es un archivo de audio".to_string());
            }
            Ok(canonica)
        }
    }
}

/// Las portadas temporales sólo pueden leerse de la carpeta `covers`.
pub fn validar_portada_temporal(path: &str) -> Result<PathBuf, String> {
    let dir = paths::covers_dir()
        .canonicalize()
        .map_err(|error| format!("No se pudo validar la carpeta de carátulas: {}", error))?;
    let archivo = Path::new(path)
        .canonicalize()
        .map_err(|error| format!("No se pudo validar la portada: {}", error))?;
    if !archivo.starts_with(&dir) || !archivo.is_file() {
        return Err("La portada debe ser un archivo de la carpeta de carátulas".to_string());
    }
    Ok(archivo)
}

#[cfg(test)]
mod tests_hardening {
    use super::*;

    #[test]
    fn el_esquema_crea_los_indices_de_filtro() {
        let connection = Connection::open_in_memory().unwrap();
        create_schema(&connection).unwrap();
        for nombre in [
            "library_idx_artist",
            "library_idx_album",
            "library_idx_year",
            "library_idx_genre",
        ] {
            let existe: bool = connection
                .query_row(
                    "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?1",
                    [nombre],
                    |_| Ok(true),
                )
                .optional()
                .unwrap()
                .unwrap_or(false);
            assert!(existe, "falta el índice {nombre}");
        }
    }

    #[test]
    fn validar_scope_rechaza_archivos_fuera_de_la_raiz() {
        const NANOS: u128 = 1_000_000_000;
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
            / NANOS;
        let base = std::env::current_dir()
            .unwrap()
            .join("target")
            .join("test-tmp")
            .join(format!("sakura-scope-{}-{stamp}", std::process::id()));
        let raiz = base.join("library");
        std::fs::create_dir_all(&raiz).unwrap();
        let dentro = raiz.join("dentro.flac");
        let fuera = base.join("fuera.flac");
        std::fs::write(&dentro, b"audio").unwrap();
        std::fs::write(&fuera, b"audio").unwrap();

        assert!(validar_scope(&raiz.to_string_lossy(), &dentro).is_ok());
        assert!(validar_scope(&raiz.to_string_lossy(), &fuera).is_err());

        std::fs::remove_dir_all(base).unwrap();
    }
}

#[cfg(test)]
mod tests_migracion {
    use super::*;

    #[test]
    fn migracion_versiona_y_backupea_antes_de_subir_el_esquema() {
        const NANOS: u128 = 1_000_000_000;
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
            / NANOS;
        let base = std::env::current_dir()
            .unwrap()
            .join("target")
            .join("test-tmp")
            .join(format!("sakura-migracion-{}-{stamp}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        paths::set_test_data_dir(base.clone());

        // Base "vieja": esquema actual pero marcada como versión 1.
        {
            let conexion = Connection::open(paths::library_db_file()).unwrap();
            create_schema(&conexion).unwrap();
            conexion.execute("PRAGMA user_version = 1", []).unwrap();
            upsert_on(
                &conexion,
                &ScanEntry {
                    track: ScannedTrack {
                        id: "t1".to_string(),
                        path: r"C:\M\a.flac".to_string(),
                        title: "Antes de migrar".to_string(),
                        artist: "Artista".to_string(),
                        album: "Álbum".to_string(),
                        album_artist: None,
                        track_number: None,
                        duration: 100,
                        duration_str: "1:40".to_string(),
                        format: "FLAC".to_string(),
                        bitrate_kbps: None,
                        cover_url: None,
                        year: None,
                        genre: None,
                        file_size: 10,
                    },
                    modified_ns: 0,
                },
            )
            .unwrap();
        }

        initialize().unwrap();

        let conexion = Connection::open(paths::library_db_file()).unwrap();
        let version: i32 = conexion
            .query_row("PRAGMA user_version", [], |fila| fila.get(0))
            .unwrap();
        assert_eq!(version, USER_VERSION_ACTUAL);
        let total: i64 = conexion
            .query_row("SELECT COUNT(*) FROM library_tracks", [], |fila| {
                fila.get(0)
            })
            .unwrap();
        assert_eq!(total, 1);
        let indice: bool = conexion
            .query_row(
                "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'library_idx_genre'",
                [],
                |_| Ok(true),
            )
            .optional()
            .unwrap()
            .unwrap_or(false);
        assert!(indice);

        let backups: Vec<_> = std::fs::read_dir(&base)
            .unwrap()
            .flatten()
            .filter(|entrada| entrada.file_name().to_string_lossy().ends_with(".bak"))
            .collect();
        assert!(!backups.is_empty(), "debió crearse un respaldo automático");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(path: &str, title: &str) -> ScanEntry {
        ScanEntry {
            track: ScannedTrack {
                id: path.to_string(),
                path: path.to_string(),
                title: title.to_string(),
                artist: "Artista".to_string(),
                album: "Álbum".to_string(),
                album_artist: None,
                track_number: Some(1),
                duration: 123,
                duration_str: "2:03".to_string(),
                format: "FLAC".to_string(),
                bitrate_kbps: Some(900),
                cover_url: None,
                year: Some(2026),
                genre: Some("Rock".to_string()),
                file_size: 1024,
            },
            modified_ns: 456,
        }
    }

    fn track_con(path: &str, title: &str, artist: &str, album: &str) -> ScanEntry {
        let mut entrada = track(path, title);
        entrada.track.artist = artist.to_string();
        entrada.track.album = album.to_string();
        entrada
    }

    #[test]
    fn busqueda_fts_encuentra_por_titulo_artista_y_album() {
        let connection = Connection::open_in_memory().unwrap();
        create_schema(&connection).unwrap();
        let entradas = [
            track_con(r"C:\M\a.flac", "Gurenge", "LiSA", "Demon Slayer"),
            track_con(r"C:\M\b.flac", "Idol", "YOASOBI", "Oshi no Ko"),
            track_con(r"C:\M\c.flac", "Otra", "Artista", "Álbum"),
        ];
        for entrada in &entradas {
            upsert_on(&connection, entrada).unwrap();
        }

        assert_eq!(search_tracks_on(&connection, "guren", 10).unwrap().len(), 1);
        assert_eq!(
            search_tracks_on(&connection, "yoasobi", 10).unwrap().len(),
            1
        );
        assert_eq!(search_tracks_on(&connection, "oshi", 10).unwrap().len(), 1);
        assert!(search_tracks_on(&connection, "", 10).unwrap().is_empty());
    }

    #[test]
    fn busqueda_fts_ignora_acentos_y_caracteres_especiales() {
        let connection = Connection::open_in_memory().unwrap();
        create_schema(&connection).unwrap();
        upsert_on(
            &connection,
            &track_con(r"C:\M\a.flac", "Canción", "Artista", "Álbum"),
        )
        .unwrap();

        assert_eq!(
            search_tracks_on(&connection, "cancion", 10).unwrap().len(),
            1
        );
        assert_eq!(
            search_tracks_on(&connection, "can-ción!", 10)
                .unwrap()
                .len(),
            1
        );
    }

    #[test]
    fn busqueda_fts_se_actualiza_al_modificar_y_borrar() {
        let connection = Connection::open_in_memory().unwrap();
        create_schema(&connection).unwrap();
        let mut entrada = track_con(r"C:\M\a.flac", "Antes", "Artista", "Álbum");
        upsert_on(&connection, &entrada).unwrap();
        assert_eq!(search_tracks_on(&connection, "antes", 10).unwrap().len(), 1);

        entrada.track.title = "Después".to_string();
        upsert_on(&connection, &entrada).unwrap();
        assert!(
            search_tracks_on(&connection, "antes", 10)
                .unwrap()
                .is_empty()
        );
        assert_eq!(
            search_tracks_on(&connection, "despues", 10).unwrap().len(),
            1
        );

        connection
            .execute(
                "DELETE FROM library_tracks WHERE path = ?1",
                [&entrada.track.path],
            )
            .unwrap();
        assert!(
            search_tracks_on(&connection, "despues", 10)
                .unwrap()
                .is_empty()
        );
    }

    #[test]
    fn scan_sync_actualiza_y_quita_pistas_ausentes() {
        let mut connection = Connection::open_in_memory().unwrap();
        create_schema(&connection).unwrap();
        let first = track(r"C:\Music\first.flac", "Primera");
        let second = track(r"C:\Music\second.flac", "Segunda");
        sync_scan_on(
            &mut connection,
            Path::new(r"C:\Music"),
            &[first.clone(), second],
        )
        .unwrap();

        sync_scan_on(
            &mut connection,
            Path::new(r"C:\Music"),
            std::slice::from_ref(&first),
        )
        .unwrap();
        let cached = read_tracks(&connection).unwrap();

        assert_eq!(cached.len(), 1);
        assert_eq!(cached[0].track.title, "Primera");
        assert_eq!(cached[0].modified_ns, 456);
    }

    #[test]
    fn scan_de_otra_carpeta_reemplaza_la_biblioteca_activa() {
        let mut connection = Connection::open_in_memory().unwrap();
        create_schema(&connection).unwrap();
        sync_scan_on(
            &mut connection,
            Path::new(r"C:\Music\Old"),
            &[track(r"C:\Music\Old\old.flac", "Anterior")],
        )
        .unwrap();
        sync_scan_on(
            &mut connection,
            Path::new(r"D:\Audio"),
            &[track(r"D:\Audio\new.flac", "Nueva")],
        )
        .unwrap();

        let cached = read_tracks(&connection).unwrap();
        assert_eq!(cached.len(), 1);
        assert_eq!(cached[0].track.title, "Nueva");
    }

    #[test]
    fn borrar_pista_elimina_archivo_y_rechaza_rutas_fuera_de_la_biblioteca() {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let test_dir = std::env::current_dir()
            .unwrap()
            .join("target")
            .join("test-tmp")
            .join(format!(
                "sakura-library-delete-{}-{stamp}",
                std::process::id()
            ));
        let root = test_dir.join("library");
        std::fs::create_dir_all(&root).unwrap();
        let in_library = root.join("inside.flac");
        let outside_library = test_dir.join("outside.flac");
        std::fs::write(&in_library, b"audio").unwrap();
        std::fs::write(&outside_library, b"audio").unwrap();

        let connection = Connection::open_in_memory().unwrap();
        create_schema(&connection).unwrap();
        connection
            .execute(
                "INSERT INTO library_state (key, value) VALUES ('root_path', ?1)",
                [root.to_string_lossy().as_ref()],
            )
            .unwrap();
        let inside_entry = track(&in_library.to_string_lossy(), "Dentro");
        let outside_entry = track(&outside_library.to_string_lossy(), "Fuera");
        upsert_on(&connection, &inside_entry).unwrap();
        upsert_on(&connection, &outside_entry).unwrap();

        assert!(delete_track_on(&connection, &outside_entry.track.path).is_err());
        assert!(outside_library.exists());
        delete_track_on(&connection, &inside_entry.track.path).unwrap();
        assert!(!in_library.exists());
        assert_eq!(read_tracks(&connection).unwrap().len(), 1);

        std::fs::remove_dir_all(test_dir).unwrap();
    }
}
