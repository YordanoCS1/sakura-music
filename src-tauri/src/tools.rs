//! Instalación de yt-dlp y FFmpeg bajo demanda.
//!
//! Los binarios no se empaquetan con la app: se descargan sólo cuando el
//! usuario lo pide y no hay ninguno en el PATH. Las URLs y los hashes están
//! fijados, así que una respuesta distinta se rechaza antes de escribir nada.

use std::io::{Cursor, Read};
use std::path::PathBuf;

use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};
use zip::ZipArchive;

use crate::{downloader, logging, paths, scanner};

pub const YTDLP_VERSION: &str = "2026.10.26";
pub const YTDLP_URL: &str =
    "https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.26/yt-dlp.exe";
pub const YTDLP_SHA256: &str = "f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d";

pub const FFMPEG_VERSION: &str = "9.0 (LGPL)";
pub const FFMPEG_URL: &str = "https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/latest/ffmpeg-n9.0-latest-win64-lgpl-9.0.zip";
pub const FFMPEG_SHA256: &str = "dc9c8e63a54d26263502190820f941b9068212d588d5548423bc23e23470e14a";

#[derive(Serialize, Clone, Debug)]
pub struct ToolProgress {
    pub tool: String,
    pub descargado: u64,
    pub total: u64,
    pub estado: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct ToolStatus {
    pub id: String,
    pub nombre: String,
    pub instalada: bool,
    pub en_bin: bool,
    pub ruta: Option<String>,
    pub version: String,
}

fn nombre_binario(tool: &str) -> &'static str {
    match (tool, cfg!(windows)) {
        ("ytdlp", true) => "yt-dlp.exe",
        ("ytdlp", false) => "yt-dlp",
        (_, true) => "ffmpeg.exe",
        (_, false) => "ffmpeg",
    }
}

fn destino(tool: &str) -> PathBuf {
    paths::bin_dir().join(nombre_binario(tool))
}

fn verificar_hash(bytes: &[u8], esperado: &str) -> bool {
    let calculado = format!("{:x}", Sha256::digest(bytes));
    calculado.eq_ignore_ascii_case(esperado.trim_start_matches("sha256:"))
}

fn datos_de(tool: &str) -> Result<(&'static str, &'static str, &'static str), String> {
    match tool {
        "ytdlp" => Ok((YTDLP_URL, YTDLP_SHA256, YTDLP_VERSION)),
        "ffmpeg" => Ok((FFMPEG_URL, FFMPEG_SHA256, FFMPEG_VERSION)),
        _ => Err(format!("Herramienta desconocida: {}", tool)),
    }
}

/// Extrae `ffmpeg.exe` del zip de FFmpeg-Builds, que lo guarda bajo `bin/`.
fn extraer_ffmpeg(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let mut archivo = ZipArchive::new(Cursor::new(bytes))
        .map_err(|error| format!("No se pudo abrir el paquete de FFmpeg: {}", error))?;
    let indice = (0..archivo.len())
        .find(|&i| {
            archivo
                .by_index(i)
                .map(|entrada| entrada.name().ends_with("bin/ffmpeg.exe"))
                .unwrap_or(false)
        })
        .ok_or_else(|| "El paquete de FFmpeg no contiene bin/ffmpeg.exe".to_string())?;
    let mut entrada = archivo
        .by_index(indice)
        .map_err(|error| format!("No se pudo leer ffmpeg.exe: {}", error))?;
    let mut salida = Vec::with_capacity(entrada.size() as usize);
    entrada
        .read_to_end(&mut salida)
        .map_err(|error| format!("No se pudo extraer ffmpeg.exe: {}", error))?;
    Ok(salida)
}

async fn descargar(
    app: &AppHandle,
    tool: &str,
    url: &str,
    esperado: &str,
) -> Result<Vec<u8>, String> {
    let mut respuesta = reqwest::get(url)
        .await
        .map_err(|error| format!("No se pudo descargar {}: {}", tool, error))?;
    if !respuesta.status().is_success() {
        return Err(format!(
            "El servidor devolvió HTTP {} al descargar {}",
            respuesta.status().as_u16(),
            tool
        ));
    }
    let total = respuesta.content_length().unwrap_or(0);
    let mut bytes = Vec::with_capacity(total as usize);
    let mut siguiente_aviso = 65_536u64;
    while let Some(parte) = respuesta
        .chunk()
        .await
        .map_err(|error| format!("Fallo la descarga de {}: {}", tool, error))?
    {
        bytes.extend_from_slice(&parte);
        if bytes.len() as u64 >= siguiente_aviso {
            let _ = app.emit(
                "tools-download-progress",
                ToolProgress {
                    tool: tool.to_string(),
                    descargado: bytes.len() as u64,
                    total,
                    estado: "descargando".to_string(),
                },
            );
            siguiente_aviso += 65_536;
        }
    }
    if !verificar_hash(&bytes, esperado) {
        return Err(format!(
            "La descarga de {} no pasó la verificación SHA256; no se instaló nada",
            tool
        ));
    }
    Ok(bytes)
}

fn estado(tool: &str, version: &str) -> ToolStatus {
    let destino = destino(tool);
    let detectada = if tool == "ytdlp" {
        downloader::find_ytdlp_binary()
    } else {
        downloader::find_ffmpeg_binary()
    };
    let en_bin = destino.exists();
    ToolStatus {
        id: tool.to_string(),
        nombre: if tool == "ytdlp" {
            "yt-dlp".to_string()
        } else {
            "FFmpeg".to_string()
        },
        instalada: detectada.is_some(),
        en_bin,
        ruta: detectada.map(|ruta| ruta.to_string_lossy().to_string()),
        version: version.to_string(),
    }
}

pub fn estados() -> Vec<ToolStatus> {
    vec![
        estado("ytdlp", YTDLP_VERSION),
        estado("ffmpeg", FFMPEG_VERSION),
    ]
}

/// Descarga, verifica e instala una herramienta. Nunca reemplaza un binario
/// que el usuario ya tiene en el PATH: si existe, no hace falta instalarlo.
pub async fn instalar(app: &AppHandle, tool: &str) -> Result<ToolStatus, String> {
    let (url, esperado, version) = datos_de(tool)?;
    if estado(tool, version).instalada {
        return Ok(estado(tool, version));
    }

    let bytes = descargar(app, tool, url, esperado).await?;
    let contenido = if tool == "ffmpeg" {
        extraer_ffmpeg(&bytes)?
    } else {
        bytes
    };
    let destino = destino(tool);
    scanner::write_atomic(&destino, &contenido)
        .map_err(|error| format!("No se pudo guardar {}: {}", destino.display(), error))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&destino, std::fs::Permissions::from_mode(0o755));
    }

    logging::info(
        "tools",
        &format!("Instalada {} en {}", tool, destino.display()),
    );
    let _ = app.emit(
        "tools-download-progress",
        ToolProgress {
            tool: tool.to_string(),
            descargado: contenido.len() as u64,
            total: contenido.len() as u64,
            estado: "listo".to_string(),
        },
    );
    Ok(estado(tool, version))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn verifica_el_hash_sha256() {
        // SHA-256 de "abc".
        let esperado = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
        assert!(verificar_hash(b"abc", esperado));
        assert!(verificar_hash(b"abc", &format!("sha256:{}", esperado)));
        assert!(!verificar_hash(b"abd", esperado));
    }

    #[test]
    fn los_binarios_van_a_la_carpeta_bin() {
        assert!(destino("ytdlp").ends_with(nombre_binario("ytdlp")));
        assert!(destino("ffmpeg").ends_with(nombre_binario("ffmpeg")));
        assert_eq!(destino("ytdlp").parent(), destino("ffmpeg").parent());
    }

    #[test]
    fn rechaza_un_zip_sin_ffmpeg() {
        let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
        zip.start_file("readme.txt", zip::write::SimpleFileOptions::default())
            .unwrap();
        zip.write_all(b"No hay binarios aqui").unwrap();
        let datos = zip.finish().unwrap().into_inner();
        assert!(extraer_ffmpeg(&datos).is_err());
    }

    #[test]
    fn extrae_el_binario_del_zip() {
        let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
        zip.start_file(
            "ffmpeg-9.0/bin/ffmpeg.exe",
            zip::write::SimpleFileOptions::default(),
        )
        .unwrap();
        zip.write_all(b"BINARY").unwrap();
        let datos = zip.finish().unwrap().into_inner();
        assert_eq!(extraer_ffmpeg(&datos).unwrap(), b"BINARY");
    }
}
