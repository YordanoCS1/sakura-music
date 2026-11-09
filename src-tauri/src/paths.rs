//! Resolución de la carpeta de datos de la aplicación.
//!
//! Tauri entrega una ruta estable por usuario (`app_local_data_dir`). Antes se
//! usaba `current_dir()`, que en producción puede ser `System32` o la carpeta
//! del instalador. Este módulo centraliza la decisión y deja un fallback para
//! tests o llamadas tempranas.

use std::path::PathBuf;
use std::sync::OnceLock;

static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

/// Fija la carpeta de datos. Se llama una sola vez durante el arranque.
pub fn init(dir: PathBuf) {
    let _ = DATA_DIR.set(dir);
}

/// Carpeta de datos ya resuelta, o `.tauri_data` como último recurso.
pub fn data_dir() -> PathBuf {
    if let Some(dir) = DATA_DIR.get() {
        return dir.clone();
    }
    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    dir.push(".tauri_data");
    dir
}

pub fn ensure_data_dir() -> PathBuf {
    let dir = data_dir();
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn cache_file() -> PathBuf {
    ensure_data_dir().join("library_cache.json")
}

pub fn queue_file() -> PathBuf {
    ensure_data_dir().join("download_queue.json")
}

pub fn covers_dir() -> PathBuf {
    let dir = ensure_data_dir().join("covers");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn bin_dir() -> PathBuf {
    let dir = ensure_data_dir().join("bin");
    let _ = std::fs::create_dir_all(&dir);
    dir
}
