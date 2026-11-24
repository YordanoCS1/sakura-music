use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{Manager, State};

pub mod catalog;
pub mod downloader;
pub mod library_db;
pub mod library_watcher;
pub mod logging;
pub mod lyrics;
pub mod paths;
pub mod playlists;
pub mod queue;
pub mod remote;
pub mod scanner;
pub mod tools;
pub mod validacion;
use downloader::{DownloadManager, DownloaderStatus, OnlineSearchResult};
use queue::PersistedDownload;
use scanner::{BatchUpdateResult, ScannedTrack};
use validacion as val;

#[tauri::command]
fn check_downloader_tools() -> DownloaderStatus {
    downloader::get_status()
}

/// Estado de las herramientas instalables, para el panel de Ajustes.
#[tauri::command]
fn tools_status() -> Vec<tools::ToolStatus> {
    tools::estados()
}

#[tauri::command]
async fn install_downloader_tools(
    app: tauri::AppHandle,
    tool: String,
) -> Result<tools::ToolStatus, String> {
    tools::instalar(&app, &tool).await
}

#[tauri::command]
fn search_online(
    app: tauri::AppHandle,
    request_id: String,
    query: String,
) -> Result<Vec<OnlineSearchResult>, String> {
    val::texto(&request_id, 64, "Identificador de petición")?;
    val::texto(&query, val::MAX_CONSULTA, "Búsqueda")?;
    downloader::search_youtube(&app, &request_id, &query)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
fn start_download(
    app: tauri::AppHandle,
    manager: State<'_, Arc<DownloadManager>>,
    job_id: String,
    url: String,
    format: String,
    output_dir: Option<String>,
    title: Option<String>,
    artist: Option<String>,
) -> Result<bool, String> {
    val::texto(&job_id, 64, "Identificador de descarga")?;
    val::texto_opcional(&title, 200, "Título")?;
    val::texto_opcional(&artist, 200, "Artista")?;
    val::texto(&url, 2048, "URL")?;
    val::texto(&format, 64, "Formato")?;
    if let Some(dir) = &output_dir {
        val::ruta(dir, "Carpeta de destino")?;
    }
    let out = output_dir.unwrap_or_else(|| {
        app.path()
            .audio_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| ".".to_string())
    });

    downloader::execute_download(
        app,
        Arc::clone(manager.inner()),
        job_id,
        url,
        format,
        out,
        title,
        artist,
    )?;
    Ok(true)
}

#[tauri::command]
fn cancel_download(manager: State<'_, Arc<DownloadManager>>, job_id: String) -> bool {
    manager.cancel(&job_id)
}

/// Ajusta cuántas descargas corren en paralelo (1..=4).
#[tauri::command]
fn set_download_concurrency(manager: State<'_, Arc<DownloadManager>>, max: usize) -> usize {
    manager.set_max_concurrent(max)
}

#[tauri::command]
fn cancel_all_downloads(manager: State<'_, Arc<DownloadManager>>) -> bool {
    manager.cancel_all();
    true
}

/// Foto persistida de la cola. Al arrancar, las filas activas vuelven como
/// `interrumpida` para que el frontend las relance.
#[tauri::command]
fn list_download_history() -> Result<Vec<library_db::DownloadHistoryItem>, String> {
    library_db::list_download_history()
}

#[tauri::command]
fn clear_download_history() -> Result<(), String> {
    library_db::clear_download_history()
}

#[tauri::command]
fn get_download_queue() -> Vec<PersistedDownload> {
    queue::load_queue()
}

#[tauri::command]
fn save_download_queue(items: Vec<PersistedDownload>) -> bool {
    queue::save_queue(items)
}

#[derive(Serialize, Deserialize)]
pub struct AppInfo {
    pub engine: String,
    pub rust_version: String,
    pub memory_usage: String,
    pub tracks_loaded: usize,
}

#[cfg(windows)]
fn current_memory_usage() -> String {
    use windows_sys::Win32::System::ProcessStatus::{
        GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS,
    };
    use windows_sys::Win32::System::Threading::GetCurrentProcess;

    // SAFETY: la estructura se inicializa a cero y se rellena `cb` con su tamaño
    // antes de pasarla a la API de Windows; el handle de GetCurrentProcess es
    // válido mientras el proceso siga vivo.
    unsafe {
        let mut counters: PROCESS_MEMORY_COUNTERS = std::mem::zeroed();
        counters.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
        if GetProcessMemoryInfo(GetCurrentProcess(), &mut counters, counters.cb) != 0 {
            let mb = counters.WorkingSetSize as f64 / (1024.0 * 1024.0);
            return format!("~{:.0} MB", mb);
        }
    }
    "—".to_string()
}

#[cfg(not(windows))]
fn current_memory_usage() -> String {
    "—".to_string()
}

#[tauri::command]
fn get_app_info(tracks_count: Option<usize>) -> AppInfo {
    AppInfo {
        engine: "Tauri 2.0 + Rust Engine".to_string(),
        rust_version: option_env!("RUSTC_VERSION")
            .unwrap_or("rustc (desconocido)")
            .to_string(),
        memory_usage: current_memory_usage(),
        tracks_loaded: tracks_count.unwrap_or(0),
    }
}

#[tauri::command]
fn library_scan_needed(folder: String) -> Result<bool, String> {
    val::ruta(&folder, "Carpeta de biblioteca")?;
    library_db::scan_needed(&folder)
}

/// Sólo registra el vigilante y el scope sin re-leer los tags de los archivos.
#[tauri::command]
fn prepare_library_watch(
    app: tauri::AppHandle,
    watcher: State<'_, library_watcher::LibraryWatcher>,
    folder_path: String,
) -> Result<bool, String> {
    val::ruta(&folder_path, "Carpeta de biblioteca")?;
    let ruta = Path::new(&folder_path);
    if !ruta.is_dir() {
        return Err(format!(
            "La carpeta de biblioteca no existe: {}",
            folder_path
        ));
    }
    watcher.watch(app.clone(), ruta)?;
    let canonica = ruta
        .canonicalize()
        .map_err(|error| format!("No se pudo resolver la carpeta elegida: {}", error))?;
    app.asset_protocol_scope()
        .allow_directory(&canonica, true)
        .map_err(|error| format!("No se pudo autorizar la carpeta elegida: {}", error))?;
    Ok(true)
}

#[tauri::command]
fn get_default_music_dir(app: tauri::AppHandle) -> Option<String> {
    app.path()
        .audio_dir()
        .ok()
        .filter(|p| p.exists())
        .map(|p| p.to_string_lossy().to_string())
}

/// Habilita en el scope del protocolo `asset:` las carpetas de una biblioteca.
/// El alcance estático solo cubre Música y la carpeta de datos; si el usuario
/// elige otra unidad, hay que autorizarla en tiempo de ejecución.
///
/// Sólo se autorizan carpetas que, una vez resuelta la ruta canónica, quedan
/// dentro de la raíz activa. Así un webview comprometido no puede ensanchar el
/// scope con rutas que vinieran en un `invoke` manipulado.
fn allow_track_paths(app: &tauri::AppHandle, tracks: &[ScannedTrack]) -> Result<(), String> {
    let root_str = match library_db::root_path() {
        Ok(root) => root,
        // Todavía no se escaneó nada: no hay pistas a las que dar acceso.
        Err(error) => {
            logging::warn("lib", &format!("Sin raíz de biblioteca: {}", error));
            return Ok(());
        }
    };
    let root = Path::new(&root_str)
        .canonicalize()
        .map_err(|error| format!("No se pudo resolver la carpeta de la biblioteca: {}", error))?;
    let scope = app.asset_protocol_scope();
    let mut seen = std::collections::HashSet::new();
    for track in tracks {
        let Some(parent) = Path::new(&track.path).parent() else {
            continue;
        };
        let canonical = parent.canonicalize().map_err(|error| {
            format!(
                "No se pudo resolver la carpeta de {}: {}",
                track.path, error
            )
        })?;
        if !canonical.starts_with(&root) {
            return Err(format!(
                "La pista {} está fuera de la carpeta de la biblioteca",
                track.path
            ));
        }
        if seen.insert(canonical.clone()) {
            scope.allow_directory(&canonical, true).map_err(|error| {
                format!("No se pudo autorizar {}: {}", canonical.display(), error)
            })?;
        }
    }
    Ok(())
}

#[tauri::command]
fn get_cached_library(app: tauri::AppHandle) -> Result<Vec<ScannedTrack>, String> {
    let tracks = library_db::cached_tracks()?
        .into_iter()
        .map(|entry| entry.track)
        .collect::<Vec<_>>();
    allow_track_paths(&app, &tracks)?;
    Ok(tracks)
}

/// Búsqueda full-text (FTS5) sobre título, artista y álbum.
#[tauri::command]
fn search_library_fts(query: String, limit: Option<usize>) -> Result<Vec<ScannedTrack>, String> {
    val::texto(&query, val::MAX_CONSULTA, "Búsqueda")?;
    let limite = limit.unwrap_or(300).min(val::MAX_LIMITE);
    let tracks = library_db::search_tracks(&query, limite)?;
    Ok(tracks)
}

/// Comandos del control remoto local.
#[tauri::command]
fn remote_set_enabled(activo: bool) -> bool {
    remote::set_activo(activo);
    activo
}

#[tauri::command]
fn remote_is_enabled() -> bool {
    remote::remote()
        .activo
        .load(std::sync::atomic::Ordering::Relaxed)
}

#[tauri::command]
fn remote_local_ip() -> String {
    remote::ip_local()
}

/// PIN del control remoto, para mostrarlo en Ajustes y armar el QR.
#[tauri::command]
fn remote_pin() -> String {
    remote::pin_actual()
}

/// Devuelve al servidor HTTP el resultado de un comando ejecutado en la PC.
#[tauri::command]
fn remote_responder(id: String, resultado: serde_json::Value) {
    let resolucion = if resultado.get("ok") == Some(&serde_json::Value::Bool(false)) {
        Err(resultado
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("Error al ejecutar el comando")
            .to_string())
    } else {
        Ok(resultado
            .get("valor")
            .cloned()
            .unwrap_or(serde_json::Value::Null))
    };
    remote::responder_invoke(&id, resolucion);
}

#[tauri::command]
fn remote_update_state(title: String, artist: String, playing: bool, position: f64, duration: f64) {
    // El estado del remoto no es crítico: si llega un texto desmedido se
    // recorta en vez de tumbar el comando.
    let title: String = title.chars().take(val::MAX_TEXTO).collect();
    let artist: String = artist.chars().take(val::MAX_TEXTO).collect();
    *remote::remote().estado.lock() = remote::RemoteState {
        title,
        artist,
        playing,
        position,
        duration,
    };
}

#[tauri::command]
fn clear_library_cache() -> Result<bool, String> {
    library_db::clear()?;
    Ok(true)
}

#[tauri::command]
fn delete_library_track(path: String) -> Result<String, String> {
    val::ruta(&path, "Ruta del archivo")?;
    library_db::delete_track(&path)
}

/// Borra las portadas temporales de sesiones anteriores. El frontend solo usa
/// una a la vez; si no se limpian, la carpeta `covers` crece sin control.
fn cleanup_temp_covers() {
    let dir = paths::covers_dir();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("temp_") {
                let _ = std::fs::remove_file(entry.path());
            }
        }
    }
}

#[tauri::command]
fn save_temp_cover(bytes: Vec<u8>) -> Result<String, String> {
    val::cantidad(bytes.len(), val::MAX_IMAGEN_BYTES, "Imagen de portada")?;
    cleanup_temp_covers();
    let covers_dir = paths::covers_dir();
    let ext = scanner::detect_image_ext(&bytes);
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let temp_file = covers_dir.join(format!("temp_{}.{}", stamp, ext));
    scanner::write_atomic(&temp_file, &bytes)
        .map_err(|e| format!("Error al escribir imagen temporal: {}", e))?;
    Ok(temp_file.to_string_lossy().to_string())
}

#[tauri::command]
// Un argumento por campo opcional del editor, para no perder "no tocar".
#[allow(clippy::too_many_arguments)]
fn update_track_metadata(
    path: String,
    title: String,
    artist: String,
    album: String,
    album_artist: Option<String>,
    track_number: Option<u32>,
    year: Option<u32>,
    genre: Option<String>,
    cover_path: Option<String>,
    remove_cover: Option<bool>,
) -> Result<ScannedTrack, String> {
    validar_edicion(
        &path,
        &title,
        &artist,
        &album,
        &album_artist,
        &genre,
        &cover_path,
        track_number,
        year,
    )?;
    let updated = scanner::update_track_tags(
        &path,
        title,
        artist,
        album,
        album_artist,
        track_number,
        year,
        genre,
        cover_path,
        remove_cover.unwrap_or(false),
    )?;

    library_db::upsert_track(&updated)
        .map_err(|error| format!("Metadatos guardados, pero falló la caché: {}", error))?;

    Ok(updated)
}

#[tauri::command]
// Igual que la edición individual: la firma refleja el formulario del editor.
#[allow(clippy::too_many_arguments)]
fn update_batch_metadata(
    paths: Vec<String>,
    artist: Option<String>,
    album: Option<String>,
    album_artist: Option<String>,
    year: Option<u32>,
    genre: Option<String>,
    cover_path: Option<String>,
    remove_cover: Option<bool>,
) -> BatchUpdateResult {
    if let Err(error) = validar_lote(
        &paths,
        &artist,
        &album,
        &album_artist,
        &genre,
        &cover_path,
        year,
    ) {
        return BatchUpdateResult {
            updated: Vec::new(),
            errors: vec![error],
        };
    }
    let mut result = scanner::update_batch_tags(
        paths,
        artist,
        album,
        album_artist,
        year,
        genre,
        cover_path,
        remove_cover.unwrap_or(false),
    );

    for updated in &result.updated {
        if let Err(error) = library_db::upsert_track(updated) {
            result.errors.push(format!(
                "{}: tags guardados, pero falló la caché: {}",
                updated.path, error
            ));
        }
    }

    result
}

/// Validación compartida por el editor individual y el lote. Además de los
/// límites de tamaño, comprueba que el archivo esté dentro de la raíz activa:
/// sin esto, un `invoke` manipulado podría escribir tags en cualquier archivo
/// del disco al que el proceso tenga acceso.
#[allow(clippy::too_many_arguments)]
fn validar_edicion(
    path: &str,
    title: &str,
    artist: &str,
    album: &str,
    album_artist: &Option<String>,
    genre: &Option<String>,
    cover_path: &Option<String>,
    track_number: Option<u32>,
    year: Option<u32>,
) -> Result<(), String> {
    val::ruta(path, "Ruta del archivo")?;
    library_db::validar_archivo_de_biblioteca(path)?;
    val::texto(title, val::MAX_TEXTO, "Título")?;
    val::texto(artist, val::MAX_TEXTO, "Artista")?;
    val::texto(album, val::MAX_TEXTO, "Álbum")?;
    val::texto_opcional(album_artist, val::MAX_TEXTO, "Artista del álbum")?;
    val::texto_opcional(genre, val::MAX_TEXTO, "Género")?;
    val::texto_opcional(cover_path, val::MAX_RUTA, "Portada")?;
    val::numero(track_number, val::MAX_PISTA, "Número de pista")?;
    val::numero(year, val::MAX_ANIO, "Año")?;
    if let Some(cover) = cover_path {
        library_db::validar_portada_temporal(cover)?;
    }
    Ok(())
}

fn validar_lote(
    paths: &[String],
    artist: &Option<String>,
    album: &Option<String>,
    album_artist: &Option<String>,
    genre: &Option<String>,
    cover_path: &Option<String>,
    year: Option<u32>,
) -> Result<(), String> {
    val::cantidad(paths.len(), val::MAX_LOTE, "Cantidad de pistas")?;
    val::texto_opcional(artist, val::MAX_TEXTO, "Artista")?;
    val::texto_opcional(album, val::MAX_TEXTO, "Álbum")?;
    val::texto_opcional(album_artist, val::MAX_TEXTO, "Artista del álbum")?;
    val::texto_opcional(genre, val::MAX_TEXTO, "Género")?;
    val::texto_opcional(cover_path, val::MAX_RUTA, "Portada")?;
    val::numero(year, val::MAX_ANIO, "Año")?;
    for path in paths {
        val::ruta(path, "Ruta del archivo")?;
        library_db::validar_archivo_de_biblioteca(path)?;
    }
    if let Some(cover) = cover_path {
        library_db::validar_portada_temporal(cover)?;
    }
    Ok(())
}

/* ----------------------------- playlists -------------------------------- */

#[tauri::command]
fn list_playlists() -> Result<Vec<playlists::Playlist>, String> {
    playlists::list()
}

#[tauri::command]
fn create_playlist(name: String) -> Result<playlists::Playlist, String> {
    val::texto(&name, 80, "Nombre de la playlist")?;
    if name.trim().is_empty() {
        return Err("El nombre de la playlist no puede estar vacío".to_string());
    }
    playlists::create(name.trim())
}

#[tauri::command]
fn rename_playlist(id: String, name: String) -> Result<(), String> {
    val::texto(&id, 64, "Identificador de playlist")?;
    val::texto(&name, 80, "Nombre de la playlist")?;
    if name.trim().is_empty() {
        return Err("El nombre de la playlist no puede estar vacío".to_string());
    }
    playlists::rename(&id, name.trim())
}

#[tauri::command]
fn delete_playlist(id: String) -> Result<(), String> {
    val::texto(&id, 64, "Identificador de playlist")?;
    playlists::delete(&id)
}

#[tauri::command]
fn get_playlist(id: String) -> Result<playlists::PlaylistDetail, String> {
    val::texto(&id, 64, "Identificador de playlist")?;
    playlists::detail(&id)
}

#[tauri::command]
fn playlist_add_tracks(id: String, paths: Vec<String>) -> Result<usize, String> {
    val::texto(&id, 64, "Identificador de playlist")?;
    val::cantidad(paths.len(), val::MAX_LOTE, "Cantidad de pistas")?;
    for path in &paths {
        val::ruta(path, "Ruta del archivo")?;
    }
    playlists::add_tracks(&id, &paths)
}

#[tauri::command]
fn playlist_remove_track(id: String, path: String) -> Result<(), String> {
    val::texto(&id, 64, "Identificador de playlist")?;
    val::ruta(&path, "Ruta del archivo")?;
    playlists::remove_track(&id, &path)
}

#[tauri::command]
fn playlist_reorder(id: String, paths: Vec<String>) -> Result<(), String> {
    val::texto(&id, 64, "Identificador de playlist")?;
    val::cantidad(paths.len(), val::MAX_LOTE, "Cantidad de pistas")?;
    for path in &paths {
        val::ruta(path, "Ruta del archivo")?;
    }
    playlists::reorder(&id, &paths)
}

/* --------------------------- papelera / letras -------------------------- */

#[tauri::command]
fn restore_deleted_track(token: String) -> Result<String, String> {
    val::texto(&token, 128, "Identificador del borrado")?;
    library_db::restore_deleted_track(&token)
}

#[tauri::command]
fn empty_trash() -> Result<usize, String> {
    library_db::empty_trash()
}

#[tauri::command]
fn trash_count() -> Result<i64, String> {
    library_db::trash_count()
}

#[tauri::command]
fn read_lyrics(path: String) -> Result<Vec<lyrics::LyricLine>, String> {
    val::ruta(&path, "Ruta del archivo")?;
    lyrics::read_for(&path)
}

/// Búsqueda de letras con el mismo patrón que el catálogo de metadatos:
/// Rust consulta LRCLIB y devuelve resultados tipados al frontend.
#[tauri::command]
async fn search_lyrics(
    query: String,
    artist: Option<String>,
    album: Option<String>,
    duration: Option<u32>,
) -> Result<Vec<lyrics::LyricsSearchResult>, String> {
    val::texto(&query, val::MAX_CONSULTA, "Búsqueda de letras")?;
    val::texto_opcional(&artist, val::MAX_TEXTO, "Artista")?;
    val::texto_opcional(&album, val::MAX_TEXTO, "Álbum")?;
    val::numero(duration, 86_400, "Duración")?;
    lyrics::search_online(&query, artist.as_deref(), album.as_deref(), duration).await
}

#[tauri::command]
fn save_track_lyrics(path: String, lrc: String) -> Result<String, String> {
    val::ruta(&path, "Ruta del archivo")?;
    val::cantidad(lrc.len(), 200_000, "Letras")?;
    lyrics::save_for(&path, &lrc)
}

#[tauri::command]
fn delete_track_lyrics(path: String) -> Result<(), String> {
    val::ruta(&path, "Ruta del archivo")?;
    lyrics::delete_for(&path)
}

/// Panel de salud de la base de datos en Ajustes → Sistema.
#[tauri::command]
fn doctor_database() -> Result<library_db::DoctorResultado, String> {
    library_db::doctor_detallado()
}

#[tauri::command]
fn vacuum_database() -> Result<String, String> {
    library_db::vacuum_database()
}

#[tauri::command]
fn backup_database() -> Result<String, String> {
    library_db::backup_database()
}

#[tauri::command]
fn get_system_logs(limit: Option<usize>) -> Result<String, String> {
    logging::read_logs(limit.unwrap_or(200).min(val::MAX_LOGS))
}

#[tauri::command]
fn resolve_playlist(
    app: tauri::AppHandle,
    request_id: String,
    url: String,
) -> Result<downloader::PlaylistInfo, String> {
    val::texto(&request_id, 64, "Identificador de petición")?;
    val::texto(&url, 2048, "URL")?;
    downloader::resolve_playlist(&app, &request_id, &url)
}

#[tauri::command]
fn scan_library(
    app: tauri::AppHandle,
    watcher: State<'_, library_watcher::LibraryWatcher>,
    folder_path: String,
) -> Result<Vec<ScannedTrack>, String> {
    let p = Path::new(&folder_path);
    if !p.is_dir() {
        return Err(format!(
            "La carpeta de biblioteca no existe: {}",
            folder_path
        ));
    }
    watcher.watch(app.clone(), p)?;
    // La ruta se canoniza antes de ampliar el scope: es la raíz que eligió el
    // usuario, así que un fallo aquí debe llegar al frontend como error.
    let canonical = p
        .canonicalize()
        .map_err(|error| format!("No se pudo resolver la carpeta elegida: {}", error))?;
    app.asset_protocol_scope()
        .allow_directory(&canonical, true)
        .map_err(|error| format!("No se pudo autorizar la carpeta elegida: {}", error))?;
    let cached = library_db::cached_tracks()?
        .into_iter()
        .map(|entry| (entry.track.path.clone(), entry))
        .collect::<std::collections::HashMap<_, _>>();
    let entries = scanner::list_audio_files(p)
        .par_iter()
        .map(|path| -> Result<Option<library_db::ScanEntry>, String> {
            let (file_size, modified_ns) = match scanner::file_fingerprint(path) {
                Ok(fingerprint) => fingerprint,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
                Err(error) => {
                    return Err(format!(
                        "No se pudo consultar {}: {}",
                        path.display(),
                        error
                    ));
                }
            };
            let path_string = path.to_string_lossy().to_string();
            if let Some(entry) = cached.get(&path_string)
                && entry.track.file_size == file_size
                && entry.modified_ns == modified_ns
            {
                return Ok(Some(entry.clone()));
            }
            Ok(scanner::scan_audio_file(path)
                .map(|track| library_db::ScanEntry { track, modified_ns }))
        })
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();

    library_db::sync_scan(p, &entries)?;
    let tracks = entries
        .into_iter()
        .map(|entry| entry.track)
        .collect::<Vec<_>>();
    allow_track_paths(&app, &tracks)?;
    logging::info(
        "lib",
        &format!("Escaneo terminado: {} pistas", tracks.len()),
    );
    Ok(tracks)
}

/// Resuelve la carpeta de datos de la app instalada y, si viene de una
/// instalación antigua desarrollada en el repo, copia `.tauri_data` ahí para
/// no perder la biblioteca. Se llama antes de abrir SQLite.
fn preparar_directorio_datos(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let destino = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("No se pudo resolver la carpeta de datos: {error}"))?;
    eprintln!(
        "Sakura Music · APPLOCALDATA resuelto: {}",
        destino.display()
    );
    let writable = (|| -> bool {
        if std::fs::create_dir_all(&destino).is_err() {
            return false;
        }
        let prueba = destino.join(".sakura-write-test");
        std::fs::write(&prueba, b"ok").is_ok() && std::fs::remove_file(&prueba).is_ok()
    })();
    let destino = if writable {
        destino
    } else {
        // Sandboxes de desarrollo o carpetas protegidas: usamos la carpeta del
        // proyecto. En una instalación normal APPLOCALDATA sí es escribible.
        let alternativo = std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(".tauri_data");
        let _ = std::fs::create_dir_all(&alternativo);
        logging::warn(
            "lib",
            &format!(
                "APPLOCALDATA no escribible; usando {} como respaldo",
                alternativo.display()
            ),
        );
        alternativo
    };

    let anterior = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".tauri_data");
    let hay_datos_nuevos = destino.join("library.sqlite3").exists();
    if !hay_datos_nuevos && anterior.join("library.sqlite3").exists() {
        copiar_arbol(&anterior, &destino)?;
        logging::info(
            "lib",
            &format!(
                "Datos migrados de {} a {}",
                anterior.display(),
                destino.display()
            ),
        );
    }
    Ok(destino)
}

fn copiar_arbol(origen: &Path, destino: &Path) -> Result<(), String> {
    for entrada in std::fs::read_dir(origen)
        .map_err(|error| format!("No se pudo leer la carpeta anterior: {error}"))?
        .flatten()
    {
        let destino_entrada = destino.join(entrada.file_name());
        let tipo = entrada
            .file_type()
            .map_err(|error| format!("No se pudo inspeccionar un dato: {error}"))?;
        if tipo.is_dir() {
            std::fs::create_dir_all(&destino_entrada)
                .map_err(|error| format!("No se pudo crear una subcarpeta: {error}"))?;
            copiar_arbol(&entrada.path(), &destino_entrada)?;
        } else if !destino_entrada.exists() {
            std::fs::copy(entrada.path(), &destino_entrada)
                .map_err(|error| format!("No se pudo copiar un dato: {error}"))?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(Arc::new(DownloadManager::new(2)))
        .manage(library_watcher::LibraryWatcher::new())
        .setup(|app| {
            let handle = app.handle().clone();

            // La app instalada NO puede escribir en el directorio de trabajo
            // (suele ser Program Files o el escritorio). Tauri nos da una
            // carpeta APPLOCALDATA con permisos, que además ya está en el
            // scope del protocolo `asset:`.
            let data_dir = preparar_directorio_datos(&handle)?;
            eprintln!("Sakura Music · carpeta de datos: {}", data_dir.display());
            logging::info(
                "lib",
                &format!("Carpeta de datos resuelta: {}", data_dir.display()),
            );
            paths::init(data_dir.clone());
            library_db::initialize().map_err(std::io::Error::other)?;
            if let Err(error) = remote::iniciar(handle.clone()) {
                crate::logging::warn("remote", &format!("Control remoto no disponible: {error}"));
            }
            cleanup_temp_covers();
            let covers_dir = paths::covers_dir();
            app.asset_protocol_scope()
                .allow_directory(&covers_dir, true)?;

            let _window =
                tauri::WebviewWindowBuilder::new(&handle, "main", tauri::WebviewUrl::default())
                    .title("Sakura Music")
                    .inner_size(1200.0, 760.0)
                    .min_inner_size(940.0, 600.0)
                    .center()
                    // Sin barra de título nativa: la UI dibuja una barra personalizada
                    // (TitleBar.tsx) acorde al tema Estudio.
                    .decorations(false)
                    .data_directory(data_dir)
                    .build()?;

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            get_default_music_dir,
            library_scan_needed,
            prepare_library_watch,
            get_cached_library,
            search_library_fts,
            remote_set_enabled,
            remote_is_enabled,
            remote_local_ip,
            remote_pin,
            remote_responder,
            remote_update_state,
            clear_library_cache,
            delete_library_track,
            scan_library,
            check_downloader_tools,
            tools_status,
            install_downloader_tools,
            search_online,
            start_download,
            cancel_download,
            cancel_all_downloads,
            set_download_concurrency,
            get_download_queue,
            list_download_history,
            clear_download_history,
            save_download_queue,
            update_track_metadata,
            update_batch_metadata,
            save_temp_cover,
            resolve_playlist,
            catalog::search_catalog_songs,
            catalog::search_catalog_albums,
            catalog::open_catalog_album,
            doctor_database,
            vacuum_database,
            backup_database,
            get_system_logs,
            list_playlists,
            create_playlist,
            rename_playlist,
            delete_playlist,
            get_playlist,
            playlist_add_tracks,
            playlist_remove_track,
            playlist_reorder,
            restore_deleted_track,
            empty_trash,
            trash_count,
            exportar_biblioteca,
            importar_biblioteca,
            read_lyrics,
            search_lyrics,
            save_track_lyrics,
            delete_track_lyrics
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
        ) && let Some(manager) = app_handle.try_state::<Arc<DownloadManager>>()
        {
            manager.cancel_all();
        }
    });
}

/// Exporta la biblioteca completa a un archivo portátil: copia consistente de
/// SQLite (VACUUM INTO), carátulas, letras y preferencias del tema.
#[tauri::command]
fn exportar_biblioteca(ruta: String, preferencias: Option<String>) -> Result<String, String> {
    use std::io::Write;

    val::ruta(&ruta, "Ruta de exportación")?;
    let destino = PathBuf::from(&ruta);
    if let Some(carpeta) = destino.parent() {
        std::fs::create_dir_all(carpeta)
            .map_err(|error| format!("No se pudo crear la carpeta: {error}"))?;
    }
    let archivo = std::fs::File::create(&destino)
        .map_err(|error| format!("No se pudo crear el archivo: {error}"))?;

    let mut writer = zip::ZipWriter::new(archivo);
    let opciones = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Copia consistente de la BD con WAL activo.
    let temporal = paths::data_dir().join("export-temp.sqlite3");
    let _ = std::fs::remove_file(&temporal);
    library_db::backup_a(&temporal)?;
    {
        let mut origen = std::fs::File::open(&temporal)
            .map_err(|error| format!("No se pudo leer la copia: {error}"))?;
        writer
            .start_file("library.sqlite3", opciones)
            .map_err(|error| format!("No se pudo agregar la BD: {error}"))?;
        std::io::copy(&mut origen, &mut writer)
            .map_err(|error| format!("No se pudo copiar la BD: {error}"))?;
    }
    let _ = std::fs::remove_file(&temporal);

    // Carátulas.
    if let Ok(entradas) = std::fs::read_dir(paths::covers_dir()) {
        for entrada in entradas.flatten() {
            let ruta_archivo = entrada.path();
            if !ruta_archivo.is_file() {
                continue;
            }
            let nombre = format!(
                "covers/{}",
                ruta_archivo
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
            );
            if let Ok(mut contenido) = std::fs::File::open(&ruta_archivo)
                && writer.start_file(&nombre, opciones).is_ok()
            {
                let _ = std::io::copy(&mut contenido, &mut writer);
            }
        }
    }

    // Preferencias del frontend (el serialization lo hace la UI).
    let preferencias = preferencias.unwrap_or_else(|| "{}".to_string());
    writer
        .start_file("preferencias.json", opciones)
        .map_err(|error| format!("No se pudo agregar preferencias: {error}"))?;
    writer
        .write_all(preferencias.as_bytes())
        .map_err(|error| format!("No se pudo escribir preferencias: {error}"))?;

    writer
        .finish()
        .map_err(|error| format!("No se pudo cerrar el archivo: {error}"))?;
    Ok(destino.to_string_lossy().to_string())
}

/// Importa un backup portátil validando que el ZIP contenga lo esperado.
#[tauri::command]
fn importar_biblioteca(ruta: String) -> Result<String, String> {
    val::ruta(&ruta, "Ruta de importación")?;
    let archivo = std::fs::File::open(&ruta)
        .map_err(|error| format!("No se pudo abrir el archivo: {error}"))?;
    let mut archive = zip::ZipArchive::new(archivo)
        .map_err(|error| format!("No es un backup válido: {error}"))?;
    if archive.by_name("library.sqlite3").is_err() {
        return Err("El archivo no contiene library.sqlite3".to_string());
    }
    // Se importa en un archivo temporal y se valida antes de reemplazar.
    let temporal = paths::data_dir().join("import-temp.sqlite3");
    {
        let mut origen = archive
            .by_name("library.sqlite3")
            .map_err(|e| e.to_string())?;
        let mut destino = std::fs::File::create(&temporal).map_err(|e| e.to_string())?;
        std::io::copy(&mut origen, &mut destino).map_err(|e| e.to_string())?;
    }
    {
        let conexion = rusqlite::Connection::open(&temporal).map_err(|e| e.to_string())?;
        conexion
            .pragma_query_value(None, "integrity_check", |fila| fila.get::<_, String>(0))
            .map_err(|e| format!("Base inválida: {e}"))?;
    }
    std::fs::rename(&temporal, paths::library_db_file())
        .map_err(|error| format!("No se pudo instalar la base: {error}"))?;

    for i in 0..archive.len() {
        let mut archivo = archive.by_index(i).map_err(|e| e.to_string())?;
        let nombre = archivo.name().to_string();
        if nombre.starts_with("covers/") && !nombre.ends_with('/') {
            let destino = paths::covers_dir().join(nombre.trim_start_matches("covers/"));
            if let Some(carpeta) = destino.parent() {
                let _ = std::fs::create_dir_all(carpeta);
            }
            let mut salida = std::fs::File::create(destino).map_err(|e| e.to_string())?;
            let _ = std::io::copy(&mut archivo, &mut salida);
        }
    }
    Ok("Biblioteca importada correctamente".to_string())
}
