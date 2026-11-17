use std::path::Path;
use std::time::Duration;

use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::{paths, scanner::ScannedTrack};

#[derive(Clone)]
pub struct ScanEntry {
    pub track: ScannedTrack,
    pub modified_ns: i64,
}

const TRACK_COLUMNS: &str = "id, path, title, artist, album, album_artist, track_number, \
    duration, duration_str, format, bitrate_kbps, cover_url, year, genre, file_size, modified_ns";

fn open_connection() -> Result<Connection, String> {
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
    Ok(connection)
}

fn create_schema(connection: &Connection) -> Result<(), String> {
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
             );",
        )
        .map_err(|error| format!("No se pudo inicializar SQLite: {}", error))
}

fn upsert_on(connection: &Connection, entry: &ScanEntry) -> Result<(), rusqlite::Error> {
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

fn read_entry(row: &Row<'_>) -> rusqlite::Result<ScanEntry> {
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
                Err(error) => {
                    eprintln!(
                        "No se pudo importar {} a SQLite; se conserva el archivo original: {}",
                        legacy_file.display(),
                        error
                    );
                }
            },
            Err(error) => {
                eprintln!(
                    "No se pudo leer la caché anterior {}: {}",
                    legacy_file.display(),
                    error
                );
            }
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

pub fn initialize() -> Result<(), String> {
    let mut connection = open_connection()?;
    create_schema(&connection)?;
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
            let canonical_root = Path::new(&root_path).canonicalize().map_err(|error| {
                format!("No se pudo validar la carpeta de biblioteca: {}", error)
            })?;
            let canonical_file = file_path
                .canonicalize()
                .map_err(|error| format!("No se pudo validar el archivo: {}", error))?;
            if !canonical_file.starts_with(&canonical_root) {
                return Err("El archivo está fuera de la carpeta de biblioteca activa".to_string());
            }
            if !canonical_file.is_file() {
                return Err("La ruta seleccionada no es un archivo de audio".to_string());
            }
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

pub fn delete_track(path: &str) -> Result<(), String> {
    let connection = open_connection()?;
    delete_track_on(&connection, path)
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

        sync_scan_on(&mut connection, Path::new(r"C:\Music"), &[first.clone()]).unwrap();
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
