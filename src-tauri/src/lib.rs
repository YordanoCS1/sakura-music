use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

mod scanner;
mod downloader;
use scanner::ScannedTrack;
use downloader::{DownloaderStatus, OnlineSearchResult};

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
    job_id: String,
    url: String,
    format: String,
    output_dir: Option<String>,
) -> Result<bool, String> {
    let out = output_dir.unwrap_or_else(|| {
        if let Ok(profile) = std::env::var("USERPROFILE") {
            PathBuf::from(profile).join("Music").to_string_lossy().to_string()
        } else {
            ".".to_string()
        }
    });

    downloader::execute_download(app, job_id, url, format, out);
    Ok(true)
}

#[derive(Serialize, Deserialize)]
pub struct AppInfo {
    pub engine: String,
    pub rust_version: String,
    pub memory_usage: String,
    pub tracks_loaded: usize,
}

#[tauri::command]
fn get_app_info(tracks_count: Option<usize>) -> AppInfo {
    AppInfo {
        engine: "Tauri 2.0 + Rust Engine".to_string(),
        rust_version: "rustc 1.99.1".to_string(),
        memory_usage: "~22 MB".to_string(),
        tracks_loaded: tracks_count.unwrap_or(0),
    }
}

#[tauri::command]
fn get_default_music_dir() -> Option<String> {
    if let Ok(profile) = std::env::var("USERPROFILE") {
        let music = PathBuf::from(profile).join("Music");
        if music.exists() {
            return Some(music.to_string_lossy().to_string());
        }
    }
    None
}

fn get_cache_file_path() -> PathBuf {
    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    dir.push(".tauri_data");
    let _ = std::fs::create_dir_all(&dir);
    dir.push("library_cache.json");
    dir
}

#[tauri::command]
fn get_cached_library() -> Vec<ScannedTrack> {
    let cache_file = get_cache_file_path();
    if cache_file.exists() {
        if let Ok(data) = std::fs::read_to_string(&cache_file) {
            if let Ok(tracks) = serde_json::from_str::<Vec<ScannedTrack>>(&data) {
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

#[tauri::command]
fn save_temp_cover(bytes: Vec<u8>) -> Result<String, String> {
    let covers_dir = scanner::get_covers_dir();
    let temp_file = covers_dir.join(format!("temp_{}.jpg", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)));
    std::fs::write(&temp_file, bytes).map_err(|e| format!("Error al escribir imagen temporal: {}", e))?;
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
                        let _ = std::fs::write(&cache_file, json);
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
) -> Result<Vec<ScannedTrack>, String> {
    let updated_list = scanner::update_batch_tags(
        paths,
        artist,
        album,
        album_artist,
        year,
        genre,
        cover_path,
        remove_cover.unwrap_or(false),
    )?;

    // Sincronizar en la caché de disco
    let cache_file = get_cache_file_path();
    if cache_file.exists() {
        if let Ok(data) = std::fs::read_to_string(&cache_file) {
            if let Ok(mut tracks) = serde_json::from_str::<Vec<ScannedTrack>>(&data) {
                for updated in &updated_list {
                    if let Some(pos) = tracks.iter().position(|t| t.path == updated.path) {
                        tracks[pos] = updated.clone();
                    }
                }
                if let Ok(json) = serde_json::to_string(&tracks) {
                    let _ = std::fs::write(&cache_file, json);
                }
            }
        }
    }

    Ok(updated_list)
}

#[tauri::command]
fn resolve_playlist(url: String) -> Result<downloader::PlaylistInfo, String> {
    downloader::resolve_playlist(&url)
}

#[tauri::command]
fn scan_library(folder_path: String) -> Vec<ScannedTrack> {
    let p = Path::new(&folder_path);
    if !p.exists() {
        return Vec::new();
    }
    let tracks = scanner::scan_directory_parallel(p);

    // Guardar en disco sin límites de cuota de navegador
    let cache_file = get_cache_file_path();
    if let Ok(json) = serde_json::to_string(&tracks) {
        let _ = std::fs::write(cache_file, json);
    }

    tracks
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            // Directorio local seguro en la carpeta del proyecto
            let mut data_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            data_dir.push(".tauri_data");
            let _ = std::fs::create_dir_all(&data_dir);

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
            get_cached_library,
            clear_library_cache,
            scan_library,
            check_downloader_tools,
            search_online,
            start_download,
            update_track_metadata,
            update_batch_metadata,
            save_temp_cover,
            resolve_playlist
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
