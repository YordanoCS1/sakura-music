use lofty::prelude::*;
use lofty::probe::Probe;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

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
    pub bitrate_kbps: Option<u32>,
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

/// Reintenta la escritura atómica con espera creciente (50, 100, 150 ms…).
/// En Windows el reproductor o un antivirus pueden mantener el archivo abierto
/// unos instantes; esperar evita perder la edición por un bloqueo temporal.
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

fn ensure_cover_thumbnail(data: &[u8], hash: u128) {
    write_cover_thumbnail(data, &paths::cover_thumbs_dir(), hash);
}

fn write_cover_thumbnail(data: &[u8], thumbs_dir: &Path, hash: u128) {
    let thumb_path = thumbs_dir.join(format!("{hash:x}.jpg"));
    if thumb_path.exists() {
        return;
    }
    let Ok(img) = image::load_from_memory(data) else {
        return;
    };
    let thumb = if img.width() > 256 || img.height() > 256 {
        img.thumbnail(256, 256)
    } else {
        img
    };
    let mut buf = std::io::Cursor::new(Vec::new());
    if thumb
        .to_rgb8()
        .write_to(&mut buf, image::ImageFormat::Jpeg)
        .is_ok()
    {
        let _ = write_atomic(&thumb_path, buf.get_ref());
    }
}

fn extract_cover_art(tag: Option<&lofty::tag::Tag>, parent_dir: &Path) -> Option<String> {
    // 1. Intentar la portada incrustada en el archivo y guardarla en caché.
    // Elegir la más grande: los tags pueden traer una miniatura (64x64)
    // junto a la portada principal; quedarse con la primera la mostraba borrosa.
    if let Some(t) = tag {
        let pic = t.pictures().iter().max_by_key(|p| p.data().len());
        if let Some(pic) = pic {
            let data = pic.data();
            let hash = fnv1a_128(data);
            let filename = format!("{:x}.{}", hash, cover_extension(pic));
            let cover_path = paths::covers_dir().join(&filename);

            if !cover_path.exists() {
                let _ = write_atomic(&cover_path, data);
            }
            ensure_cover_thumbnail(data, hash);
            if cover_path.exists() {
                return Some(cover_path.to_string_lossy().to_string());
            }
        }
    }

    // 2. Sin portada incrustada, buscar una imagen suelta junto al álbum:
    // varios ripper la dejan como cover.jpg en vez de embeberla.
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
            if let Ok(data) = std::fs::read(&p) {
                ensure_cover_thumbnail(&data, fnv1a_128(&data));
            }
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
            let tag = tagged_file
                .primary_tag()
                .or_else(|| tagged_file.first_tag());
            let properties = tagged_file.properties();
            let duration = properties.duration().as_secs();
            let bitrate_kbps = properties.audio_bitrate();

            let title = tag
                .and_then(|t| t.title())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| filename.clone());

            // Sin tags, los campos quedan vacíos y la UI muestra "—".
            // No se inventa ningún "desconocido": las canciones salen tal cual.
            let artist = tag
                .and_then(|t| t.artist())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            let album = tag
                .and_then(|t| t.album())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();

            let year = tag.and_then(|t| t.year());
            let genre = tag.and_then(|t| t.genre()).map(|s| s.to_string());
            let track_number = tag.and_then(|t| t.track());
            let album_artist = tag
                .and_then(|t| t.get_string(&lofty::tag::ItemKey::AlbumArtist))
                .map(|s| s.to_string());
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
                bitrate_kbps,
                cover_url,
                year,
                genre,
                file_size,
            })
        }
        Err(_) => Some(ScannedTrack {
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
            bitrate_kbps: None,
            cover_url: extract_cover_art(None, parent),
            year: None,
            genre: None,
            file_size,
        }),
    }
}

pub fn file_fingerprint(path: &Path) -> std::io::Result<(u64, i64)> {
    let metadata = std::fs::metadata(path)?;
    let modified_ns = metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|elapsed| elapsed.as_nanos().min(i64::MAX as u128) as i64)
        .unwrap_or(0);
    Ok((metadata.len(), modified_ns))
}

pub fn list_audio_files(dir_path: &Path) -> Vec<PathBuf> {
    WalkDir::new(dir_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file())
        .map(|entry| entry.into_path())
        .filter(|path| {
            path.extension()
                .and_then(|extension| extension.to_str())
                .map(|extension| {
                    ["mp3", "flac", "m4a", "opus", "ogg", "wav", "aac"]
                        .contains(&extension.to_lowercase().as_str())
                })
                .unwrap_or(false)
        })
        .collect()
}

fn fnv1a_128(data: &[u8]) -> u128 {
    let mut hash: u128 = 0xcbf29ce484222325;
    for &byte in data {
        hash ^= byte as u128;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

// Los campos opcionales viajan explícitos para distinguir "no tocar" de
// "vaciar". Quitar el atributo de solo lectura es intencional: Windows no
// permite renombrar sobre un archivo protegido.
#[allow(clippy::too_many_arguments, clippy::permissions_set_readonly_false)]
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
    let file_bytes = std::fs::read(path).map_err(|e| format!("Error al leer archivo: {}", e))?;

    let mut cursor = std::io::Cursor::new(file_bytes);

    // 2. Detectar el contenedor antes de leer: Lofty elige el esquema de tags
    // (ID3, Vorbis Comments, MP4…) según el formato del archivo.
    let probe = Probe::new(&mut cursor)
        .guess_file_type()
        .map_err(|e| format!("Error al detectar formato: {}", e))?;

    let tag_type = probe
        .file_type()
        .map(|ft| ft.primary_tag_type())
        .unwrap_or(lofty::tag::TagType::VorbisComments);

    let mut tagged_file = probe
        .read()
        .map_err(|e| format!("Error al leer tags: {}", e))?;

    // Un archivo sin tags no tiene bloque que editar: crear el del tipo detectado.
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

    // 3. Aplicar campos de texto: se conserva el criterio de la v1 en Python,
    // pero escribiendo los tipos nativos de Lofty en vez de cadenas.
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

    // 4. Carátula: borrar, reemplazar o conservar la actual según lo marcado.
    if remove_cover {
        while !tag.pictures().is_empty() {
            tag.remove_picture(0);
        }
    } else if let Some(ref c_path) = cover_path {
        let cp = Path::new(c_path);
        if cp.exists()
            && let Ok(mut file) = std::fs::File::open(cp)
            && let Ok(mut pic) = lofty::picture::Picture::from_reader(&mut file)
        {
            pic.set_pic_type(lofty::picture::PictureType::CoverFront);
            if !tag.pictures().is_empty() {
                tag.set_picture(0, pic);
            } else {
                tag.push_picture(pic);
            }
        }
    }

    // 5. Ensamblar los tags en un búfer en memoria: el archivo original queda
    // intacto hasta que la escritura atómica lo reemplaza de una vez.
    tagged_file
        .save_to(&mut cursor, lofty::config::WriteOptions::default())
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

    // 7. Escribir en temporal y renombrar: un corte de luz no deja tags a medias.
    if let Err(err) = write_atomic_with_retries(path, &updated_bytes, 4) {
        return Err(format!("Error al guardar en disco: {}", err));
    }

    // 8. Re-leer el archivo para devolver los tags tal como quedaron en disco.
    scan_audio_file(path).ok_or_else(|| "No se pudo re-leer la pista".to_string())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BatchUpdateResult {
    pub updated: Vec<ScannedTrack>,
    pub errors: Vec<String>,
}

// Misma firma extendida que la edición individual; ver el comentario de arriba.
#[allow(clippy::too_many_arguments, clippy::permissions_set_readonly_false)]
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

        // 1. Leer a memoria para soltar el handle de archivo cuanto antes.
        let file_bytes = match std::fs::read(path) {
            Ok(b) => b,
            Err(e) => {
                errors.push(format!("{}: error al leer: {}", path_str, e));
                continue;
            }
        };

        let mut cursor = std::io::Cursor::new(file_bytes);

        // 2. Detectar el contenedor para elegir el esquema de tags correcto.
        let probe = match Probe::new(&mut cursor).guess_file_type() {
            Ok(p) => p,
            Err(e) => {
                errors.push(format!("{}: error al detectar formato: {}", path_str, e));
                continue;
            }
        };

        let tag_type = probe
            .file_type()
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

        // 4. Carátula: borrar o reemplazar solo si el usuario lo marcó.
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

        // 5. Ensamblar en memoria antes de escribir para no dejar el archivo a medias.
        if let Err(e) = tagged_file.save_to(&mut cursor, lofty::config::WriteOptions::default()) {
            errors.push(format!("{}: error al ensamblar tags: {}", path_str, e));
            continue;
        }

        let updated_bytes = cursor.into_inner();

        // 6. Quitar solo lectura: Windows no permite renombrar sobre un archivo protegido.
        if let Ok(metadata) = std::fs::metadata(path) {
            let mut perms = metadata.permissions();
            if perms.readonly() {
                perms.set_readonly(false);
                let _ = std::fs::set_permissions(path, perms);
            }
        }

        // 7. Reintentar la escritura: otro proceso puede tener el archivo abierto unos ms.
        if let Err(err) = write_atomic_with_retries(path, &updated_bytes, 4) {
            errors.push(format!(
                "{}: no se pudo escribir en disco: {}",
                path_str, err
            ));
            continue;
        }

        // 8. Re-leer para devolver lo que realmente quedó grabado.
        if let Some(scanned) = scan_audio_file(path) {
            updated_tracks.push(scanned);
        }
    }

    BatchUpdateResult {
        updated: updated_tracks,
        errors,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detecta_extension_por_firma() {
        assert_eq!(detect_image_ext(&[0x89, b'P', b'N', b'G', 0, 0]), "png");
        assert_eq!(detect_image_ext(&[0xFF, 0xD8, 0xFF, 0xE0]), "jpg");
        assert_eq!(detect_image_ext(b"RIFF\0\0\0\0WEBPVP8 "), "webp");
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

    #[test]
    fn genera_miniatura_de_portada_en_covers_thumbs() {
        let dir = std::path::PathBuf::from("target").join(format!(
            "sakura-thumb-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();

        let img = image::RgbaImage::from_pixel(512, 512, image::Rgba([244, 63, 130, 255]));
        let mut png_bytes = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgba8(img)
            .write_to(&mut png_bytes, image::ImageFormat::Png)
            .unwrap();
        let data = png_bytes.into_inner();
        let hash = fnv1a_128(&data);

        write_cover_thumbnail(&data, &dir, hash);
        let thumb_path = dir.join(format!("{hash:x}.jpg"));
        assert!(thumb_path.exists());
        let decoded = image::open(&thumb_path).unwrap();
        assert!(decoded.width() <= 256 && decoded.height() <= 256);

        let _ = std::fs::remove_dir_all(&dir);
    }
}
