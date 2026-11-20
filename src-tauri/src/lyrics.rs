//! Letras sincronizadas en formato LRC.
//!
//! Busca un `.lrc` al lado del archivo de audio y lo convierte en líneas con
//! timestamp. No depende de librerías externas: el formato es una línea con
//! `[mm:ss.xx]texto` y los metadatos `[ar:...]`, `[ti:...]` se ignoran.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::{catalog, library_db, scanner};

/// Resultado de LRCLIB, ya normalizado para el frontend.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub struct LyricsSearchResult {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    pub instrumental: bool,
    pub plain_lyrics: String,
    pub synced_lyrics: String,
}

#[derive(Deserialize)]
struct LrclibTrack {
    id: i64,
    #[serde(rename = "trackName")]
    track_name: String,
    #[serde(rename = "artistName")]
    artist_name: String,
    #[serde(rename = "albumName")]
    album_name: Option<String>,
    duration: f64,
    instrumental: bool,
    #[serde(rename = "plainLyrics")]
    plain_lyrics: Option<String>,
    #[serde(rename = "syncedLyrics")]
    synced_lyrics: Option<String>,
}

impl From<LrclibTrack> for LyricsSearchResult {
    fn from(pista: LrclibTrack) -> Self {
        Self {
            id: pista.id,
            title: pista.track_name,
            artist: pista.artist_name,
            album: pista.album_name.unwrap_or_default(),
            duration: pista.duration,
            instrumental: pista.instrumental,
            plain_lyrics: pista.plain_lyrics.unwrap_or_default(),
            synced_lyrics: pista.synced_lyrics.unwrap_or_default(),
        }
    }
}

fn codificar(texto: &str) -> String {
    let mut salida = String::with_capacity(texto.len());
    for byte in texto.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                salida.push(byte as char)
            }
            _ => salida.push_str(&format!("%{byte:02X}")),
        }
    }
    salida
}

/// Busca letras en LRCLIB (servicio gratuito sin clave). Con título, artista y
/// duración usa `/api/get`, que es mucho más preciso; si no hay duración cae a
/// `/api/search`, que devuelve un array. Igual que el catálogo de metadatos,
/// la petición la hace Rust para no depender de CORS en el webview.
pub async fn search_online(
    query: &str,
    artist: Option<&str>,
    album: Option<&str>,
    duration: Option<u32>,
) -> Result<Vec<LyricsSearchResult>, String> {
    let consulta = query.trim();
    if consulta.is_empty() {
        return Ok(Vec::new());
    }
    let cliente = reqwest::Client::builder()
        .user_agent(catalog::APP_UA)
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let url = match (artist, duration) {
        (Some(artista), Some(segundos)) if !artista.trim().is_empty() && segundos > 0 => {
            format!(
                "https://lrclib.net/api/get?track_name={}&artist_name={}&duration={}",
                codificar(consulta),
                codificar(artista.trim()),
                segundos
            )
        }
        _ => format!("https://lrclib.net/api/search?q={}", codificar(consulta)),
    };
    let respuesta = cliente
        .get(&url)
        .send()
        .await
        .map_err(|error| format!("No se pudo consultar LRCLIB: {error}"))?;
    if respuesta.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(Vec::new());
    }
    if !respuesta.status().is_success() {
        return Err(format!(
            "LRCLIB respondió HTTP {}",
            respuesta.status().as_u16()
        ));
    }
    let crudo: serde_json::Value = respuesta
        .json()
        .await
        .map_err(|error| format!("No se pudo leer la respuesta de LRCLIB: {error}"))?;
    Ok(desde_json(&crudo, album))
}

/// Convierte la respuesta de LRCLIB (array en `/search`, objeto en `/get`) a
/// resultados ordenados. Separado de la red para poder testearlo sin internet.
fn desde_json(crudo: &serde_json::Value, album: Option<&str>) -> Vec<LyricsSearchResult> {
    let elementos: Vec<serde_json::Value> = if crudo.is_array() {
        crudo.as_array().cloned().unwrap_or_default()
    } else {
        vec![crudo.clone()]
    };
    let mut resultados: Vec<LyricsSearchResult> = elementos
        .into_iter()
        .filter_map(|valor| serde_json::from_value::<LrclibTrack>(valor).ok())
        .map(LyricsSearchResult::from)
        .collect();
    if let Some(album) = album
        && !album.trim().is_empty()
    {
        resultados.sort_by_key(|resultado| u8::from(!resultado.album.eq_ignore_ascii_case(album)));
    }
    resultados
}

/// Guarda las letras como `<nombre de la pista>.lrc`, al lado del audio. Es el
/// mismo archivo que lee `read_for`, así no hace falta una tabla de caché.
pub fn save_for(path: &str, lrc: &str) -> Result<String, String> {
    let canonica = library_db::validar_archivo_de_biblioteca(path)?;
    let destino = canonica.with_extension("lrc");
    scanner::write_atomic(&destino, lrc.as_bytes())
        .map_err(|error| format!("No se pudo guardar el archivo de letras: {error}"))?;
    logging_info(&destino);
    Ok(destino.to_string_lossy().to_string())
}

/// Quita el `.lrc` al lado de la pista. No toca el archivo de audio.
pub fn delete_for(path: &str) -> Result<(), String> {
    let canonica = library_db::validar_archivo_de_biblioteca(path)?;
    let destino = canonica.with_extension("lrc");
    match std::fs::remove_file(&destino) {
        Ok(()) => {
            logging_info(&destino);
            Ok(())
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("No se pudo borrar el archivo de letras: {error}")),
    }
}

fn logging_info(destino: &Path) {
    crate::logging::info(
        "lyrics",
        &format!("Letras actualizadas: {}", destino.display()),
    );
}

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct LyricLine {
    pub time: f64,
    pub text: String,
}

/// Convierte `[00:12.34]Letra` en `{ time: 12.34, text: "Letra" }`.
/// Una línea puede tener varios timestamps; se emite una entrada por cada uno.
pub fn parse_lrc(contenido: &str) -> Vec<LyricLine> {
    let mut lineas = Vec::new();
    for linea in contenido.lines() {
        let linea = linea.trim_end_matches('\r');
        let Some(inicio_texto) = linea.rfind(']') else {
            continue;
        };
        let texto = linea[inicio_texto + 1..].trim().to_string();
        let etiquetas = &linea[..inicio_texto + 1];
        let mut offsets = 0;
        while let Some(resto) = etiquetas[offsets..].find('[') {
            let inicio = offsets + resto;
            let Some(fin) = etiquetas[inicio..].find(']') else {
                break;
            };
            let marca = &etiquetas[inicio + 1..inicio + fin];
            if let Some(segundos) = parsear_tiempo(marca) {
                lineas.push(LyricLine {
                    time: segundos,
                    text: texto.clone(),
                });
            }
            offsets = inicio + fin + 1;
        }
    }
    lineas.sort_by(|a, b| a.time.total_cmp(&b.time));
    lineas
}

fn parsear_tiempo(marca: &str) -> Option<f64> {
    let (minutos, resto) = marca.split_once(':')?;
    let (segundos, centesimas) = match resto.split_once('.') {
        Some((s, c)) => (s, c),
        None => (resto, "0"),
    };
    let digitos = centesimas.len() as i32;
    let minutos: f64 = minutos.parse().ok()?;
    let segundos: f64 = segundos.parse().ok()?;
    let centesimas: f64 = centesimas.parse().ok()?;
    let divisor = 10_f64.powi(digitos.max(1));
    Some(minutos * 60.0 + segundos + centesimas / divisor)
}

/// Busca el `.lrc` junto a la pista. Primero el nombre exacto y después una
/// búsqueda sin distinguir mayúsculas en la carpeta (por `.LRC`).
fn archivo_de_letras(path: &Path) -> Option<PathBuf> {
    let stem = path.file_stem()?.to_string_lossy().to_string();
    let directo = path.with_extension("lrc");
    if directo.is_file() {
        return Some(directo);
    }
    let carpeta = path.parent()?;
    let entradas = std::fs::read_dir(carpeta).ok()?;
    for entrada in entradas.flatten() {
        let nombre = entrada.file_name().to_string_lossy().to_string();
        if nombre.eq_ignore_ascii_case(&format!("{stem}.lrc")) {
            return Some(entrada.path());
        }
    }
    None
}

pub fn read_for(path: &str) -> Result<Vec<LyricLine>, String> {
    library_db::validar_archivo_de_biblioteca(path)?;
    let Some(archivo) = archivo_de_letras(Path::new(path)) else {
        return Ok(Vec::new());
    };
    let contenido = std::fs::read_to_string(&archivo)
        .map_err(|error| format!("No se pudo leer {}: {}", archivo.display(), error))?;
    Ok(parse_lrc(&contenido))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parsea_tiempos_y_ignora_metadatos() {
        let lrc = "[ar:Artista]\n[ti:Título]\n[00:01.50]Primera\n[00:02.00]Segunda\n";
        let lineas = parse_lrc(lrc);
        assert_eq!(lineas.len(), 2);
        assert_eq!(lineas[0].time, 1.5);
        assert_eq!(lineas[0].text, "Primera");
        assert_eq!(lineas[1].time, 2.0);
    }

    #[test]
    fn un_timestamp_repetido_genera_varias_lineas() {
        let lineas = parse_lrc("[00:10.00][00:20.00]Estribillo\n");
        assert_eq!(lineas.len(), 2);
        assert_eq!(lineas[1].time, 20.0);
    }

    #[test]
    fn parsea_respuesta_de_lrclib_y_prefiere_el_album_de_la_pista() {
        let crudo: serde_json::Value = serde_json::from_str(
            r#"[
              {"id":1,"trackName":"Gurenge","artistName":"LiSA","albumName":"Otro",
               "duration":209,"instrumental":false,"plainLyrics":"texto","syncedLyrics":"[00:01.00]texto"},
              {"id":2,"trackName":"Gurenge","artistName":"LiSA","albumName":"Demon Slayer",
               "duration":209,"instrumental":false,"plainLyrics":"texto","syncedLyrics":"[00:01.00]texto"}
            ]"#,
        )
        .unwrap();
        let resultados = desde_json(&crudo, Some("Demon Slayer"));
        assert_eq!(resultados.len(), 2);
        assert_eq!(resultados[0].album, "Demon Slayer");
        assert!(resultados[0].synced_lyrics.starts_with("[00:01.00]"));
    }

    #[test]
    fn tolera_minutos_con_dos_cifras_de_centesimas() {
        assert_eq!(parsear_tiempo("01:02.5"), Some(62.5));
        let dos_cifras = parsear_tiempo("01:02.05").unwrap();
        assert!((dos_cifras - 62.05).abs() < 0.0001);
    }
}
