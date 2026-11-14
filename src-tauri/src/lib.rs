use std::path::{Path, PathBuf};
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};
use rayon::prelude::*;

mod scanner;
mod downloader;
mod library_db;
mod library_watcher;
mod paths;
mod queue;
use queue::PersistedDownload;
use scanner::{BatchUpdateResult, ScannedTrack};
use downloader::{DownloadManager, DownloaderStatus, OnlineSearchResult};

#[tauri::command]
fn check_downloader_tools() -> DownloaderStatus {
    downloader::get_status()
}

#[tauri::command]
fn search_online(
    app: tauri::AppHandle,
    request_id: String,
    query: String,
) -> Result<Vec<OnlineSearchResult>, String> {
    downloader::search_youtube(&app, &request_id, &query)
}

#[tauri::command]
fn start_download(
    app: tauri::AppHandle,
    manager: State<'_, Arc<DownloadManager>>,
    job_id: String,
    url: String,
    format: String,
    output_dir: Option<String>,
) -> Result<bool, String> {
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
    )?;
    Ok(true)
}

#[tauri::command]
fn cancel_download(manager: State<'_, Arc<DownloadManager>>, job_id: String) -> bool {
    manager.cancel(&job_id)
}

#[tauri::command]
fn cancel_all_downloads(manager: State<'_, Arc<DownloadManager>>) -> bool {
    manager.cancel_all();
    true
}

/// Foto persistida de la cola. Al arrancar, las filas activas vuelven como
/// `interrumpida` para que el frontend las relance.
#[tauri::command]
fn get_download_queue() -> Vec<PersistedDownload> {
    queue::load_queue()
}

#[tauri::command]
fn save_download_queue(items: Vec<PersistedDownload>) -> bool {
    queue::save_queue(items)
}

#[tauri::command]
fn clear_download_queue() -> bool {
    queue::clear_queue()
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
fn allow_track_paths(app: &tauri::AppHandle, tracks: &[ScannedTrack]) {
    let scope = app.asset_protocol_scope();
    let mut seen = std::collections::HashSet::new();
    for track in tracks {
        if let Some(parent) = Path::new(&track.path).parent() {
            if seen.insert(parent.to_path_buf()) {
                let _ = scope.allow_directory(parent, true);
            }
        }
    }
}

#[tauri::command]
fn allow_music_dir(app: tauri::AppHandle, path: String) {
    let _ = app
        .asset_protocol_scope()
        .allow_directory(Path::new(&path), true);
}

#[tauri::command]
fn get_cached_library(app: tauri::AppHandle) -> Result<Vec<ScannedTrack>, String> {
    let tracks = library_db::cached_tracks()?
        .into_iter()
        .map(|entry| entry.track)
        .collect::<Vec<_>>();
    allow_track_paths(&app, &tracks);
    Ok(tracks)
}

#[tauri::command]
fn clear_library_cache() -> Result<bool, String> {
    library_db::clear()?;
    Ok(true)
}

#[tauri::command]
fn delete_library_track(path: String) -> Result<bool, String> {
    library_db::delete_track(&path)?;
    Ok(true)
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
        remove_cover.unwrap_or(false)
    )?;
    
    library_db::upsert_track(&updated)
        .map_err(|error| format!("Metadatos guardados, pero falló la caché: {}", error))?;

    Ok(updated)
}

#[tauri::command]
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

#[tauri::command]
fn resolve_playlist(
    app: tauri::AppHandle,
    request_id: String,
    url: String,
) -> Result<downloader::PlaylistInfo, String> {
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
        return Err(format!("La carpeta de biblioteca no existe: {}", folder_path));
    }
    watcher.watch(app.clone(), p)?;
    let _ = app.asset_protocol_scope().allow_directory(p, true);
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
                    return Err(format!("No se pudo consultar {}: {}", path.display(), error));
                }
            };
            let path_string = path.to_string_lossy().to_string();
            if let Some(entry) = cached.get(&path_string) {
                if entry.track.file_size == file_size && entry.modified_ns == modified_ns {
                    return Ok(Some(entry.clone()));
                }
            }
            Ok(scanner::scan_audio_file(path).map(|track| library_db::ScanEntry {
                track,
                modified_ns,
            }))
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
    allow_track_paths(&app, &tracks);
    Ok(tracks)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(Arc::new(DownloadManager::new(2)))
        .manage(library_watcher::LibraryWatcher::new())
        .setup(|app| {
            let handle = app.handle().clone();

            // Directorio local seguro en la carpeta del proyecto
            let mut data_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            data_dir.push(".tauri_data");
            let _ = std::fs::create_dir_all(&data_dir);
            paths::init(data_dir.clone());
            library_db::initialize().map_err(std::io::Error::other)?;
            cleanup_temp_covers();
            let covers_dir = paths::covers_dir();
            app.asset_protocol_scope()
                .allow_directory(&covers_dir, true)?;

            let _window = tauri::WebviewWindowBuilder::new(
                &handle,
                "main",
                tauri::WebviewUrl::default(),
            )
            .title("Sakura Music")
            .inner_size(1200.0, 760.0)
            .min_inner_size(940.0, 600.0)
            .center()
            .data_directory(data_dir)
            .build()?;

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_app_info, 
            get_default_music_dir, 
            allow_music_dir,
            get_cached_library,
            clear_library_cache,
            delete_library_track,
            scan_library,
            check_downloader_tools,
            search_online,
            start_download,
            cancel_download,
            cancel_all_downloads,
            get_download_queue,
            save_download_queue,
            clear_download_queue,
            update_track_metadata,
            update_batch_metadata,
            save_temp_cover,
            resolve_playlist
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
        ) {
            if let Some(manager) = app_handle.try_state::<Arc<DownloadManager>>() {
                manager.cancel_all();
            }
        }
    });
}
