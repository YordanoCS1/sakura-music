use std::path::{Path, PathBuf};
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

mod scanner;
mod downloader;
mod paths;
use scanner::{BatchUpdateResult, ScannedTrack};
use downloader::{DownloadManager, DownloaderStatus, OnlineSearchResult};

#[tauri::command]
fn check_downloader_tools() -> DownloaderStatus {
    downloader::get_status()
}

#[tauri::command]
fn search_online(query: String) -> Result<Vec<OnlineSearchResult>, String> {
    downloader::search_youtube(&query)
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
    );
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

fn get_cache_file_path() -> PathBuf {
    paths::cache_file()
}

#[tauri::command]
fn get_cached_library(app: tauri::AppHandle) -> Vec<ScannedTrack> {
    let cache_file = get_cache_file_path();
    if cache_file.exists() {
        if let Ok(data) = std::fs::read_to_string(&cache_file) {
            if let Ok(tracks) = serde_json::from_str::<Vec<ScannedTrack>>(&data) {
                allow_track_paths(&app, &tracks);
                return tracks;
            }
        }
    }
    Vec::new()
}

#[tauri::command]
fn clear_library_cache() -> bool {
    let cache_file = get_cache_file_path();
    if cache_file.exists() {
        let _ = std::fs::remove_file(cache_file);
    }
    true
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
    
    // Sincronizar en la caché de disco
    let cache_file = get_cache_file_path();
    if cache_file.exists() {
        if let Ok(data) = std::fs::read_to_string(&cache_file) {
            if let Ok(mut tracks) = serde_json::from_str::<Vec<ScannedTrack>>(&data) {
                if let Some(pos) = tracks.iter().position(|t| t.path == path) {
                    tracks[pos] = updated.clone();
                    if let Ok(json) = serde_json::to_string(&tracks) {
                        let _ = scanner::write_atomic(&cache_file, json.as_bytes());
                    }
                }
            }
        }
    }

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
    let result = scanner::update_batch_tags(
        paths,
        artist,
        album,
        album_artist,
        year,
        genre,
        cover_path,
        remove_cover.unwrap_or(false),
    );

    // Sincronizar en la caché de disco
    let cache_file = get_cache_file_path();
    if cache_file.exists() {
        if let Ok(data) = std::fs::read_to_string(&cache_file) {
            if let Ok(mut tracks) = serde_json::from_str::<Vec<ScannedTrack>>(&data) {
                for updated in &result.updated {
                    if let Some(pos) = tracks.iter().position(|t| t.path == updated.path) {
                        tracks[pos] = updated.clone();
                    }
                }
                if let Ok(json) = serde_json::to_string(&tracks) {
                    let _ = scanner::write_atomic(&cache_file, json.as_bytes());
                }
            }
        }
    }

    result
}

#[tauri::command]
fn resolve_playlist(url: String) -> Result<downloader::PlaylistInfo, String> {
    downloader::resolve_playlist(&url)
}

#[tauri::command]
fn scan_library(app: tauri::AppHandle, folder_path: String) -> Vec<ScannedTrack> {
    let p = Path::new(&folder_path);
    if !p.exists() {
        return Vec::new();
    }
    let _ = app.asset_protocol_scope().allow_directory(p, true);
    let tracks = scanner::scan_directory_parallel(p);

    // Guardar en disco sin límites de cuota de navegador
    let cache_file = get_cache_file_path();
    if let Ok(json) = serde_json::to_string(&tracks) {
        let _ = scanner::write_atomic(&cache_file, json.as_bytes());
    }

    tracks
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(Arc::new(DownloadManager::new(2)))
        .setup(|app| {
            let handle = app.handle().clone();

            // Carpeta de datos estable por usuario. En producción no se puede
            // depender de `current_dir()`, que puede ser System32.
            let data_dir = app
                .path()
                .app_local_data_dir()
                .unwrap_or_else(|_| {
                    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
                    dir.push(".tauri_data");
                    dir
                });
            let _ = std::fs::create_dir_all(&data_dir);
            paths::init(data_dir.clone());
            cleanup_temp_covers();

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
            scan_library,
            check_downloader_tools,
            search_online,
            start_download,
            cancel_download,
            cancel_all_downloads,
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
