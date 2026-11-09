use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use rayon::prelude::*;
use lofty::prelude::*;
use lofty::probe::Probe;

use crate::paths;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScannedTrack {
    pub id: String,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub track_number: Option<u32>,
    pub duration: u64,
    pub duration_str: String,
    pub format: String,
    pub cover_url: Option<String>,
    pub year: Option<u32>,
    pub genre: Option<String>,
    pub file_size: u64,
}

fn format_duration(seconds: u64) -> String {
    let mins = seconds / 60;
    let secs = seconds % 60;
    format!("{}:{:02}", mins, secs)
}

/// Extensión de imagen a partir de los primeros bytes. El tipo MIME que declara
/// el tag no siempre es confiable, así que se mira la firma real del archivo.
pub fn detect_image_ext(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        "png"
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "jpg"
    } else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        "webp"
    } else if bytes.starts_with(b"GIF8") {
        "gif"
    } else {
        "jpg"
    }
}

fn cover_extension(pic: &lofty::picture::Picture) -> &'static str {
    match pic.mime_type().map(|m| m.as_str()) {
        Some("image/png") => "png",
        Some("image/webp") => "webp",
        Some("image/gif") => "gif",
        Some("image/bmp") => "bmp",
        Some("image/tiff") => "tiff",
        _ => detect_image_ext(pic.data()),
    }
}

/// Escribe un archivo sin dejar el destino a medio escribir: primero un
/// temporal en la misma carpeta y después un rename atómico.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    use std::io::Write;

    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("sakura");
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let tmp_path = parent.join(format!(
        ".{}.{}.{}.tmp",
        file_name,
        std::process::id(),
        stamp
    ));

    let result = (|| {
        {
            let mut file = std::fs::File::create(&tmp_path)?;
            file.write_all(bytes)?;
            file.sync_all()?;
        }
        std::fs::rename(&tmp_path, path)
    })();

    if result.is_err() {
        let _ = std::fs::remove_file(&tmp_path);
    }
    result
}

fn write_atomic_with_retries(path: &Path, bytes: &[u8], attempts: u32) -> std::io::Result<()> {
    let mut last_err = None;
    for attempt in 1..=attempts {
        match write_atomic(path, bytes) {
            Ok(()) => return Ok(()),
            Err(err) => {
                last_err = Some(err);
                std::thread::sleep(std::time::Duration::from_millis(50 * attempt as u64));
            }
        }
    }
    Err(last_err.unwrap_or_else(|| std::io::Error::other("la escritura atómica falló")))
}

fn extract_cover_art(tag: Option<&lofty::tag::Tag>, parent_dir: &Path) -> Option<String> {
    // 1. Intentar portada incrustada en el archivo y guardarla en cache de disco.
    // Ojo: solo se devuelve la ruta si el archivo quedó escrito y existe —
    // antes se devolvía aunque el write hubiera fallado y el frontend
    // mostraba un placeholder en su lugar.
    if let Some(t) = tag {
        if let Some(pic) = t.pictures().first() {
            let data = pic.data();
            let hash = fnv1a_128(data);
            let filename = format!("{:x}.{}", hash, cover_extension(pic));
            let cover_path = paths::covers_dir().join(&filename);

            if !cover_path.exists() {
                let _ = write_atomic(&cover_path, data);
            }
            if cover_path.exists() {
                return Some(cover_path.to_string_lossy().to_string());
            }
        }
    }

    // 2. Buscar carátula suelta en la carpeta del álbum
    for candidate in [
        "cover.jpg",
        "folder.jpg",
        "cover.jpeg",
        "folder.jpeg",
        "cover.png",
        "folder.png",
        "album.jpg",
        "front.jpg",
        "cover-art.jpg",
        "00.jpg",
        "0.jpg",
    ] {
        let p = parent_dir.join(candidate);
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }

    None
}

pub fn scan_audio_file(path: &Path) -> Option<ScannedTrack> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    let supported = ["mp3", "flac", "m4a", "opus", "ogg", "wav", "aac"];
    if !supported.contains(&ext.as_str()) {
        return None;
    }

    let file_size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let parent = path.parent().unwrap_or(path);
    let filename = path.file_stem()?.to_string_lossy().to_string();

    match Probe::open(path).and_then(|p| p.read()) {
        Ok(tagged_file) => {
            let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());
            let properties = tagged_file.properties();
            let duration = properties.duration().as_secs();

            let title = tag
                .and_then(|t| t.title())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| filename.clone());

            // Sin tags, los campos quedan vacíos y la UI muestra "—".
            // No se inventa ningún "desconocido": las canciones salen tal cual.
            let artist = tag.and_then(|t| t.artist()).map(|s| s.trim().to_string()).unwrap_or_default();
            let album = tag.and_then(|t| t.album()).map(|s| s.trim().to_string()).unwrap_or_default();

            let year = tag.and_then(|t| t.year());
            let genre = tag.and_then(|t| t.genre()).map(|s| s.to_string());
            let track_number = tag.and_then(|t| t.track());
            let album_artist = tag.and_then(|t| t.get_string(&lofty::tag::ItemKey::AlbumArtist)).map(|s| s.to_string());
            let cover_url = extract_cover_art(tag, parent);

            Some(ScannedTrack {
                id: format!("{:x}", fnv1a_128(path.to_string_lossy().as_bytes())),
                path: path.to_string_lossy().to_string(),
                title,
                artist,
                album,
                album_artist,
                track_number,
                duration,
                duration_str: format_duration(duration),
                format: ext.to_uppercase(),
                cover_url,
                year,
                genre,
                file_size,
            })
        }
        Err(_) => {
            Some(ScannedTrack {
                id: format!("{:x}", fnv1a_128(path.to_string_lossy().as_bytes())),
                path: path.to_string_lossy().to_string(),
                title: filename,
                artist: String::new(),
                album: String::new(),
                album_artist: None,
                track_number: None,
                duration: 0,
                duration_str: "--:--".to_string(),
                format: ext.to_uppercase(),
                cover_url: extract_cover_art(None, parent),
                year: None,
                genre: None,
                file_size,
            })
        }
    }
}

fn fnv1a_128(data: &[u8]) -> u128 {
    let mut hash: u128 = 0xcbf29ce484222325;
    for &byte in data {
        hash ^= byte as u128;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

pub fn update_track_tags(
    path_str: &str,
    title: String,
    artist: String,
    album: String,
    album_artist: Option<String>,
    track_number: Option<u32>,
    year: Option<u32>,
    genre: Option<String>,
    cover_path: Option<String>,
    remove_cover: bool,
) -> Result<ScannedTrack, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err("El archivo no existe en disco".to_string());
    }

    // 1. Leer los bytes completos a memoria (evita bloqueos de descriptor de archivo en Windows)
    let file_bytes = std::fs::read(path)
        .map_err(|e| format!("Error al leer archivo: {}", e))?;

    let mut cursor = std::io::Cursor::new(file_bytes);

    // 2. Detectar formato del contenedor de audio y parsear tags con Lofty
    let probe = Probe::new(&mut cursor)
        .guess_file_type()
        .map_err(|e| format!("Error al detectar formato: {}", e))?;

    let tag_type = probe.file_type()
        .map(|ft| ft.primary_tag_type())
        .unwrap_or(lofty::tag::TagType::VorbisComments);

    let mut tagged_file = probe.read()
        .map_err(|e| format!("Error al leer tags: {}", e))?;

    // Obtener tag existente o insertar uno nuevo del tipo correspondiente
    let tag = match tagged_file.primary_tag_mut() {
        Some(primary) => primary,
        None => {
            if tagged_file.first_tag_mut().is_some() {
                tagged_file.first_tag_mut().unwrap()
            } else {
                tagged_file.insert_tag(lofty::tag::Tag::new(tag_type));
                tagged_file.primary_tag_mut().unwrap()
            }
        }
    };

    // 3. Aplicar campos de texto (misma lógica que en Python, mejorada para tipos nativos)
    tag.set_title(title);
    tag.set_artist(artist);
    tag.set_album(album);

    if let Some(y) = year {
        tag.set_year(y);
    } else {
        tag.remove_year();
    }

    if let Some(ref g) = genre {
        if !g.trim().is_empty() {
            tag.set_genre(g.clone());
        } else {
            tag.remove_genre();
        }
    } else {
        tag.remove_genre();
    }

    if let Some(tn) = track_number {
        tag.set_track(tn);
    } else {
        tag.remove_track();
    }

    if let Some(ref aa) = album_artist {
        if !aa.trim().is_empty() {
            tag.insert_text(lofty::tag::ItemKey::AlbumArtist, aa.clone());
        } else {
            tag.remove_key(&lofty::tag::ItemKey::AlbumArtist);
        }
    } else {
        tag.remove_key(&lofty::tag::ItemKey::AlbumArtist);
    }

    // 4. Carátula incrustada
    if remove_cover {
        while !tag.pictures().is_empty() {
            tag.remove_picture(0);
        }
    } else if let Some(ref c_path) = cover_path {
        let cp = Path::new(c_path);
        if cp.exists() {
            if let Ok(mut file) = std::fs::File::open(cp) {
                if let Ok(mut pic) = lofty::picture::Picture::from_reader(&mut file) {
                    pic.set_pic_type(lofty::picture::PictureType::CoverFront);
                    if !tag.pictures().is_empty() {
                        tag.set_picture(0, pic);
                    } else {
                        tag.push_picture(pic);
                    }
                }
            }
        }
    }

    // 5. Inyectar tags directamente en el cursor de memoria (100% nativo Rust)
    tagged_file.save_to(&mut cursor, lofty::config::WriteOptions::default())
        .map_err(|e| format!("Error al ensamblar tags con Lofty: {}", e))?;

    let updated_bytes = cursor.into_inner();

    // 6. Quitar flag de solo lectura en Windows si existiera
    if let Ok(metadata) = std::fs::metadata(path) {
        let mut perms = metadata.permissions();
        if perms.readonly() {
            perms.set_readonly(false);
            let _ = std::fs::set_permissions(path, perms);
        }
    }

    // 7. Escribir archivo actualizado al disco (temporal + rename)
    if let Err(err) = write_atomic_with_retries(path, &updated_bytes, 4) {
        return Err(format!("Error al guardar en disco: {}", err));
    }

    // 8. Re-escanear para devolver la metadata actualizada
    scan_audio_file(path).ok_or_else(|| "No se pudo re-leer la pista".to_string())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BatchUpdateResult {
    pub updated: Vec<ScannedTrack>,
    pub errors: Vec<String>,
}

pub fn update_batch_tags(
    paths: Vec<String>,
    artist: Option<String>,
    album: Option<String>,
    album_artist: Option<String>,
    year: Option<u32>,
    genre: Option<String>,
    cover_path: Option<String>,
    remove_cover: bool,
) -> BatchUpdateResult {
    if paths.is_empty() {
        return BatchUpdateResult {
            updated: Vec::new(),
            errors: Vec::new(),
        };
    }

    // Pre-cargar la imagen si se especificó una carátula nueva para reutilizarla en memoria
    let loaded_pic: Option<lofty::picture::Picture> = if let Some(ref c_path) = cover_path {
        let cp = Path::new(c_path);
        if cp.exists() {
            if let Ok(mut file) = std::fs::File::open(cp) {
                if let Ok(mut pic) = lofty::picture::Picture::from_reader(&mut file) {
                    pic.set_pic_type(lofty::picture::PictureType::CoverFront);
                    Some(pic)
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };

    let mut updated_tracks = Vec::new();
    let mut errors = Vec::new();

    for path_str in paths {
        let path = Path::new(&path_str);
        if !path.exists() {
            errors.push(format!("{}: archivo no existe", path_str));
            continue;
        }

        // 1. Leer bytes a memoria
        let file_bytes = match std::fs::read(path) {
            Ok(b) => b,
            Err(e) => {
                errors.push(format!("{}: error al leer: {}", path_str, e));
                continue;
            }
        };

        let mut cursor = std::io::Cursor::new(file_bytes);

        // 2. Detectar formato y tags con Lofty
        let probe = match Probe::new(&mut cursor).guess_file_type() {
            Ok(p) => p,
            Err(e) => {
                errors.push(format!("{}: error al detectar formato: {}", path_str, e));
                continue;
            }
        };

        let tag_type = probe.file_type()
            .map(|ft| ft.primary_tag_type())
            .unwrap_or(lofty::tag::TagType::VorbisComments);

        let mut tagged_file = match probe.read() {
            Ok(tf) => tf,
            Err(e) => {
                errors.push(format!("{}: error al leer tags: {}", path_str, e));
                continue;
            }
        };

        let tag = match tagged_file.primary_tag_mut() {
            Some(primary) => primary,
            None => {
                if tagged_file.first_tag_mut().is_some() {
                    tagged_file.first_tag_mut().unwrap()
                } else {
                    tagged_file.insert_tag(lofty::tag::Tag::new(tag_type));
                    tagged_file.primary_tag_mut().unwrap()
                }
            }
        };

        // 3. Aplicar solo los campos que no sean None (filosofía: no tocar lo que el usuario no especificó)
        if let Some(ref a) = artist {
            tag.set_artist(a.clone());
        }
        if let Some(ref alb) = album {
            tag.set_album(alb.clone());
        }
        if let Some(ref aa) = album_artist {
            if !aa.trim().is_empty() {
                tag.insert_text(lofty::tag::ItemKey::AlbumArtist, aa.clone());
            } else {
                tag.remove_key(&lofty::tag::ItemKey::AlbumArtist);
            }
        }
        if let Some(y) = year {
            tag.set_year(y);
        }
        if let Some(ref g) = genre {
            if !g.trim().is_empty() {
                tag.set_genre(g.clone());
            } else {
                tag.remove_genre();
            }
        }

        // 4. Carátula
        if remove_cover {
            while !tag.pictures().is_empty() {
                tag.remove_picture(0);
            }
        } else if let Some(ref pic) = loaded_pic {
            if !tag.pictures().is_empty() {
                tag.set_picture(0, pic.clone());
            } else {
                tag.push_picture(pic.clone());
            }
        }

        // 5. Ensamblar en memoria
        if let Err(e) = tagged_file.save_to(&mut cursor, lofty::config::WriteOptions::default()) {
            errors.push(format!("{}: error al ensamblar tags: {}", path_str, e));
            continue;
        }

        let updated_bytes = cursor.into_inner();

        // 6. Quitar solo lectura
        if let Ok(metadata) = std::fs::metadata(path) {
            let mut perms = metadata.permissions();
            if perms.readonly() {
                perms.set_readonly(false);
                let _ = std::fs::set_permissions(path, perms);
            }
        }

        // 7. Guardar a disco con reintentos (temporal + rename)
        if let Err(err) = write_atomic_with_retries(path, &updated_bytes, 4) {
            errors.push(format!("{}: no se pudo escribir en disco: {}", path_str, err));
            continue;
        }

        // 8. Re-escanear
        if let Some(scanned) = scan_audio_file(path) {
            updated_tracks.push(scanned);
        }
    }

    BatchUpdateResult {
        updated: updated_tracks,
        errors,
    }
}

pub fn scan_directory_parallel(dir_path: &Path) -> Vec<ScannedTrack> {
    let mut files: Vec<PathBuf> = Vec::new();

    for entry in WalkDir::new(dir_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            files.push(entry.into_path());
        }
    }

    // Escaneo multihilo instantáneo con Rayon
    files
        .par_iter()
        .filter_map(|path| scan_audio_file(path))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detecta_extension_por_firma() {
        assert_eq!(detect_image_ext(&[0x89, b'P', b'N', b'G', 0, 0]), "png");
        assert_eq!(detect_image_ext(&[0xFF, 0xD8, 0xFF, 0xE0]), "jpg");
        assert_eq!(
            detect_image_ext(b"RIFF\0\0\0\0WEBPVP8 "),
            "webp"
        );
        assert_eq!(detect_image_ext(b"GIF89a"), "gif");
        assert_eq!(detect_image_ext(b"otra cosa"), "jpg");
    }

    #[test]
    fn formatea_duracion() {
        assert_eq!(format_duration(0), "0:00");
        assert_eq!(format_duration(59), "0:59");
        assert_eq!(format_duration(125), "2:05");
    }

    #[test]
    fn fnv_es_estable_y_distingue_contenido() {
        let a = fnv1a_128(b"uno");
        let b = fnv1a_128(b"dos");
        assert_ne!(a, b);
        assert_eq!(a, fnv1a_128(b"uno"));
    }

    #[test]
    fn escritura_atomica_reemplaza_y_no_deja_temporales() {
        let dir = std::env::current_dir()
            .unwrap()
            .join("target")
            .join("test-tmp")
            .join(format!(
                "sakura-atomic-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
        std::fs::create_dir_all(&dir).unwrap();
        let target = dir.join("pista.mp3");

        std::fs::write(&target, b"viejo").unwrap();
        write_atomic(&target, b"nuevo").unwrap();
        assert_eq!(std::fs::read(&target).unwrap(), b"nuevo".as_slice());

        let leftovers: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .flatten()
            .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp"))
            .collect();
        assert!(leftovers.is_empty(), "quedaron temporales");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
