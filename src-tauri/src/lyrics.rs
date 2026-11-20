//! Letras sincronizadas en formato LRC.
//!
//! Busca un `.lrc` al lado del archivo de audio y lo convierte en líneas con
//! timestamp. No depende de librerías externas: el formato es una línea con
//! `[mm:ss.xx]texto` y los metadatos `[ar:...]`, `[ti:...]` se ignoran.

use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::library_db;

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
    fn tolera_minutos_con_dos_cifras_de_centesimas() {
        assert_eq!(parsear_tiempo("01:02.5"), Some(62.5));
        let dos_cifras = parsear_tiempo("01:02.05").unwrap();
        assert!((dos_cifras - 62.05).abs() < 0.0001);
    }
}
