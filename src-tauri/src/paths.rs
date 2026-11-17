//! Resolución centralizada de la carpeta de datos de la aplicación.
//!
//! El arranque fija la carpeta con `init()` apuntando a `.tauri_data` dentro
//! del directorio de trabajo (`lib.rs`), para que la base de datos, la cola,
//! las carátulas y los binarios vivan juntos y no dependan de cada usuario.
//! `data_dir()` conserva `.tauri_data` como último recurso en tests o en
//! llamadas que lleguen antes de que termine el arranque.

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

pub fn library_db_file() -> PathBuf {
    ensure_data_dir().join("library.sqlite3")
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
