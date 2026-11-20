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
    let linea = format!("{} [{}] {}: {}\n", hora(), nivel, modulo, redactar(mensaje));
    eprintln!("{}", linea.trim_end());
    if let Ok(mut archivo) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(paths::log_file())
    {
        let _ = archivo.write_all(linea.as_bytes());
    }
}

/// Enmascara credenciales que puedan aparecer en un mensaje de error (p. ej.
/// una URL con `token=`). El log vive en disco en texto plano: mejor no guardar
/// secretos aunque hoy ningún llamador pase uno.
fn redactar(mensaje: &str) -> String {
    let mut seguro = mensaje.to_string();
    for marca in ["token=", "api_key=", "apikey=", "key=", "password="] {
        let mut inicio = 0;
        while let Some(encontrado) = seguro[inicio..].find(marca) {
            let absolute = inicio + encontrado + marca.len();
            let fin = seguro[absolute..]
                .find(|c: char| c.is_whitespace() || c == '&' || c == '"')
                .map(|offset| absolute + offset)
                .unwrap_or(seguro.len());
            if fin > absolute {
                seguro.replace_range(absolute..fin, "***");
            }
            inicio = absolute + 3;
            if inicio >= seguro.len() {
                break;
            }
        }
    }
    seguro
}

/// Últimas líneas del log para el visor de Ajustes → Sistema.
pub fn read_logs(limite: usize) -> Result<String, String> {
    let archivo = paths::log_file();
    if !archivo.exists() {
        return Ok("Todavía no hay registros en esta sesión.".to_string());
    }
    let contenido = std::fs::read_to_string(&archivo)
        .map_err(|error| format!("No se pudo leer el registro: {}", error))?;
    let lineas: Vec<&str> = contenido.lines().rev().take(limite).collect();
    Ok(lineas.into_iter().rev().collect::<Vec<_>>().join("\n"))
}

/// Aviso recuperable: la app sigue, pero conviene saber que pasó.
pub fn warn(modulo: &str, mensaje: &str) {
    escribir("WARN", modulo, mensaje);
}

/// Dato de contexto para diagnosticar un problema del usuario.
pub fn info(modulo: &str, mensaje: &str) {
    escribir("INFO", modulo, mensaje);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redactar_oculta_tokens_en_urls() {
        assert_eq!(
            redactar("GET https://x.test/?token=abc123&fmt=json"),
            "GET https://x.test/?token=***&fmt=json"
        );
    }

    #[test]
    fn redactar_respeta_mensajes_sin_secretos() {
        assert_eq!(
            redactar("Escaneo terminado: 42 pistas"),
            "Escaneo terminado: 42 pistas"
        );
    }
}
