//! Playlists persistentes en SQLite.
//!
//! Guardamos la ruta de cada pista, no una copia de sus tags: así la playlist
//! siempre muestra los metadatos actuales de la biblioteca. Si la pista se
//! borra de la biblioteca, desaparece de la playlist en la próxima consulta.

use rusqlite::{OptionalExtension, params};
use serde::Serialize;

use crate::{library_db, scanner::ScannedTrack};

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub track_count: i64,
}

#[derive(Serialize, Clone, Debug)]
pub struct PlaylistDetail {
    pub playlist: Playlist,
    pub tracks: Vec<ScannedTrack>,
}

fn ahora() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn leer_playlist(row: &rusqlite::Row<'_>) -> rusqlite::Result<Playlist> {
    Ok(Playlist {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
        track_count: row.get(3)?,
    })
}

const CONTEO: &str = "SELECT p.id, p.name, p.created_at, COUNT(pt.path)
                      FROM playlists p LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id";

pub fn list() -> Result<Vec<Playlist>, String> {
    let connection = library_db::open_connection()?;
    let sql = format!("{CONTEO} GROUP BY p.id ORDER BY p.created_at DESC");
    let mut sentencia = connection
        .prepare(&sql)
        .map_err(|error| format!("No se pudieron listar las playlists: {}", error))?;
    sentencia
        .query_map([], leer_playlist)
        .map_err(|error| format!("No se pudieron listar las playlists: {}", error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron leer las playlists: {}", error))
}

pub fn get(id: &str) -> Result<Option<Playlist>, String> {
    let connection = library_db::open_connection()?;
    let sql = format!("{CONTEO} WHERE p.id = ?1 GROUP BY p.id");
    connection
        .query_row(&sql, [id], leer_playlist)
        .optional()
        .map_err(|error| format!("No se pudo buscar la playlist: {}", error))
}

pub fn detail(id: &str) -> Result<PlaylistDetail, String> {
    let connection = library_db::open_connection()?;
    let sql = format!("{CONTEO} WHERE p.id = ?1 GROUP BY p.id");
    let playlist: Playlist = connection
        .query_row(&sql, [id], leer_playlist)
        .map_err(|error| format!("No se encontró la playlist: {}", error))?;
    let sql = format!(
        "SELECT {} FROM playlist_tracks pt
         JOIN library_tracks t ON t.path = pt.path
         WHERE pt.playlist_id = ?1 ORDER BY pt.position",
        library_db::TRACK_COLUMNS
    );
    let mut sentencia = connection
        .prepare(&sql)
        .map_err(|error| format!("No se pudieron leer las pistas: {}", error))?;
    let tracks = sentencia
        .query_map([id], |fila| {
            library_db::read_entry(fila).map(|entrada| entrada.track)
        })
        .map_err(|error| format!("No se pudieron leer las pistas: {}", error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("No se pudieron leer las pistas: {}", error))?;
    Ok(PlaylistDetail { playlist, tracks })
}

pub fn create(name: &str) -> Result<Playlist, String> {
    let connection = library_db::open_connection()?;
    let id = format!("pl-{}-{}", std::process::id(), ahora());
    connection
        .execute(
            "INSERT INTO playlists (id, name, created_at) VALUES (?1, ?2, ?3)",
            params![id, name, ahora()],
        )
        .map_err(|error| format!("No se pudo crear la playlist: {}", error))?;
    Ok(Playlist {
        id,
        name: name.to_string(),
        created_at: ahora(),
        track_count: 0,
    })
}

pub fn rename(id: &str, name: &str) -> Result<(), String> {
    let connection = library_db::open_connection()?;
    connection
        .execute(
            "UPDATE playlists SET name = ?1 WHERE id = ?2",
            params![name, id],
        )
        .map_err(|error| format!("No se pudo renombrar la playlist: {}", error))?;
    Ok(())
}

pub fn delete(id: &str) -> Result<(), String> {
    let connection = library_db::open_connection()?;
    connection
        .execute("DELETE FROM playlists WHERE id = ?1", [id])
        .map_err(|error| format!("No se pudo borrar la playlist: {}", error))?;
    Ok(())
}

/// Agrega las pistas que estén en la biblioteca y no estuvieran ya en la lista.
pub fn add_tracks(id: &str, paths: &[String]) -> Result<usize, String> {
    let mut connection = library_db::open_connection()?;
    let transaccion = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar la carga: {}", error))?;
    let ultima: i64 = transaccion
        .query_row(
            "SELECT COALESCE(MAX(position), 0) FROM playlist_tracks WHERE playlist_id = ?1",
            [id],
            |fila| fila.get(0),
        )
        .map_err(|error| format!("No se pudo ordenar la playlist: {}", error))?;
    let mut position = ultima;
    let mut agregadas = 0;
    for path in paths {
        let existe: bool = transaccion
            .query_row(
                "SELECT 1 FROM library_tracks WHERE path = ?1",
                [path],
                |_| Ok(true),
            )
            .optional()
            .map_err(|error| format!("No se pudo verificar la pista: {}", error))?
            .unwrap_or(false);
        if !existe {
            continue;
        }
        position += 1;
        let cambios = transaccion
            .execute(
                "INSERT OR IGNORE INTO playlist_tracks (playlist_id, path, position)
                 VALUES (?1, ?2, ?3)",
                params![id, path, position],
            )
            .map_err(|error| format!("No se pudo agregar la pista: {}", error))?;
        agregadas += cambios;
    }
    transaccion
        .commit()
        .map_err(|error| format!("No se pudo confirmar la carga: {}", error))?;
    Ok(agregadas)
}

pub fn remove_track(id: &str, path: &str) -> Result<(), String> {
    let connection = library_db::open_connection()?;
    connection
        .execute(
            "DELETE FROM playlist_tracks WHERE playlist_id = ?1 AND path = ?2",
            params![id, path],
        )
        .map_err(|error| format!("No se pudo quitar la pista: {}", error))?;
    Ok(())
}

/// Reordena según el array de rutas que manda el frontend (drag & drop).
pub fn reorder(id: &str, paths: &[String]) -> Result<(), String> {
    let mut connection = library_db::open_connection()?;
    let transaccion = connection
        .transaction()
        .map_err(|error| format!("No se pudo iniciar el reorden: {}", error))?;
    for (indice, path) in paths.iter().enumerate() {
        transaccion
            .execute(
                "UPDATE playlist_tracks SET position = ?1 WHERE playlist_id = ?2 AND path = ?3",
                params![indice as i64, id, path],
            )
            .map_err(|error| format!("No se pudo reordenar la playlist: {}", error))?;
    }
    transaccion
        .commit()
        .map_err(|error| format!("No se pudo confirmar el orden: {}", error))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use library_db::ScanEntry;
    use rusqlite::Connection;

    fn entrada(path: &str, titulo: &str) -> ScanEntry {
        ScanEntry {
            track: ScannedTrack {
                id: path.to_string(),
                path: path.to_string(),
                title: titulo.to_string(),
                artist: "Artista".to_string(),
                album: "Álbum".to_string(),
                album_artist: None,
                track_number: None,
                duration: 120,
                duration_str: "2:00".to_string(),
                format: "FLAC".to_string(),
                bitrate_kbps: None,
                cover_url: None,
                year: None,
                genre: None,
                file_size: 1000,
            },
            modified_ns: 0,
        }
    }

    #[test]
    fn create_rename_y_delete() {
        let connection = Connection::open_in_memory().unwrap();
        library_db::create_schema(&connection).unwrap();
        // Las funciones usan la BD global; acá probamos las consultas sobre la
        // conexión en memoria para no depender de `paths::data_dir()`.
        connection
            .execute(
                "INSERT INTO playlists (id, name, created_at) VALUES ('p1', 'Favoritas', 1)",
                [],
            )
            .unwrap();
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM playlists", [], |f| f.get(0))
            .unwrap();
        assert_eq!(count, 1);
        connection
            .execute("UPDATE playlists SET name = 'Top' WHERE id = 'p1'", [])
            .unwrap();
        let nombre: String = connection
            .query_row("SELECT name FROM playlists WHERE id = 'p1'", [], |f| {
                f.get(0)
            })
            .unwrap();
        assert_eq!(nombre, "Top");
        connection
            .execute("DELETE FROM playlists WHERE id = 'p1'", [])
            .unwrap();
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM playlists", [], |f| f.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn foreign_key_cascade_borra_las_pistas_de_la_lista() {
        let connection = Connection::open_in_memory().unwrap();
        library_db::create_schema(&connection).unwrap();
        connection.execute("PRAGMA foreign_keys = ON", []).unwrap();
        connection
            .execute(
                "INSERT INTO playlists (id, name, created_at) VALUES ('p1', 'Lista', 1)",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO playlist_tracks (playlist_id, path, position) VALUES ('p1', 'a.flac', 1)",
                [],
            )
            .unwrap();
        connection
            .execute("DELETE FROM playlists WHERE id = 'p1'", [])
            .unwrap();
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM playlist_tracks", [], |f| f.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn solo_se_agregan_pistas_indexadas() {
        let connection = Connection::open_in_memory().unwrap();
        library_db::create_schema(&connection).unwrap();
        library_db::upsert_on(&connection, &entrada("a.flac", "Dentro")).unwrap();
        let existe: bool = connection
            .query_row(
                "SELECT 1 FROM library_tracks WHERE path = 'a.flac'",
                [],
                |_| Ok(true),
            )
            .optional()
            .unwrap()
            .unwrap_or(false);
        assert!(existe);
        let fuera: bool = connection
            .query_row(
                "SELECT 1 FROM library_tracks WHERE path = 'b.flac'",
                [],
                |_| Ok(true),
            )
            .optional()
            .unwrap()
            .unwrap_or(false);
        assert!(!fuera);
    }
}
