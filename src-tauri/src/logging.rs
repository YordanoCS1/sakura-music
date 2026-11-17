//! Registro ligero en archivo, sin dependencias adicionales.
//!
//! La app se usa sin consola, así que un `eprintln!` no le sirve a nadie.
//! Cada mensaje se escribe en `<datos>/sakura.log` y también en stderr, para
//! que siga siendo visible durante `tauri dev`.

use std::io::Write;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::paths;

fn hora() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() % 86_400)
        .unwrap_or(0);
    format!(
        "{:02}:{:02}:{:02}",
        secs / 3600,
        (secs / 60) % 60,
        secs % 60
    )
}

fn escribir(nivel: &str, modulo: &str, mensaje: &str) {
    let linea = format!("{} [{}] {}: {}\n", hora(), nivel, modulo, mensaje);
    eprintln!("{}", linea.trim_end());
    if let Ok(mut archivo) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(paths::log_file())
    {
        let _ = archivo.write_all(linea.as_bytes());
    }
}

/// Aviso recuperable: la app sigue, pero conviene saber que pasó.
pub fn warn(modulo: &str, mensaje: &str) {
    escribir("WARN", modulo, mensaje);
}

/// Dato de contexto para diagnosticar un problema del usuario.
pub fn info(modulo: &str, mensaje: &str) {
    escribir("INFO", modulo, mensaje);
}
