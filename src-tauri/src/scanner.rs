use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use rayon::prelude::*;
use lofty::prelude::*;
use lofty::probe::Probe;

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

pub fn get_covers_dir() -> PathBuf {
    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    dir.push(".tauri_data");
    dir.push("covers");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn extract_cover_art(tag: Option<&lofty::tag::Tag>, parent_dir: &Path) -> Option<String> {
    // 1. Intentar portada incrustada en el archivo y guardarla en cache de disco
    if let Some(t) = tag {
        if let Some(pic) = t.pictures().first() {
            let data = pic.data();
            let hash = md5_hash(data);
            let filename = format!("{:x}.jpg", hash);
            let cover_path = get_covers_dir().join(&filename);

            if !cover_path.exists() {
                let _ = std::fs::write(&cover_path, data);
            }

            return Some(cover_path.to_string_lossy().to_string());
        }
    }

    // 2. Buscar cover.jpg, folder.jpg en la carpeta del álbum
    let candidates = ["cover.jpg", "folder.jpg", "cover.png", "folder.png", "front.jpg", "album.jpg"];
    for candidate in &candidates {
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
                .map(|s| s.to_string())
                .unwrap_or_else(|| filename.clone());

            let artist = tag
                .and_then(|t| t.artist())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "Artista Desconocido".to_string());

            let album = tag
                .and_then(|t| t.album())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "Álbum Desconocido".to_string());

            let year = tag.and_then(|t| t.year());
            let genre = tag.and_then(|t| t.genre()).map(|s| s.to_string());
            let track_number = tag.and_then(|t| t.track());
            let album_artist = tag.and_then(|t| t.get_string(&lofty::tag::ItemKey::AlbumArtist)).map(|s| s.to_string());
            let cover_url = extract_cover_art(tag, parent);

            Some(ScannedTrack {
                id: format!("{:x}", md5_hash(path.to_string_lossy().as_bytes())),
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
                id: format!("{:x}", md5_hash(path.to_string_lossy().as_bytes())),
                path: path.to_string_lossy().to_string(),
                title: filename,
                artist: "Desconocido".to_string(),
                album: "Varios".to_string(),
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

fn md5_hash(data: &[u8]) -> u128 {
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

    // 7. Escribir archivo actualizado al disco
    let mut last_err = String::new();
    let mut success = false;
    for attempt in 1..=4 {
        match std::fs::write(path, &updated_bytes) {
            Ok(_) => {
                success = true;
                break;
            }
            Err(e) => {
                last_err = format!("{}", e);
                std::thread::sleep(std::time::Duration::from_millis(50 * attempt));
            }
        }
    }

    if !success {
        return Err(format!("Error al guardar en disco: {}", last_err));
    }

    // 8. Re-escanear para devolver la metadata actualizada
    scan_audio_file(path).ok_or_else(|| "No se pudo re-leer la pista".to_string())
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
) -> Result<Vec<ScannedTrack>, String> {
    if paths.is_empty() {
        return Ok(Vec::new());
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

        // 7. Guardar a disco con reintentos
        let mut written = false;
        for attempt in 1..=4 {
            if std::fs::write(path, &updated_bytes).is_ok() {
                written = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(40 * attempt));
        }

        if !written {
            errors.push(format!("{}: no se pudo escribir en disco", path_str));
            continue;
        }

        // 8. Re-escanear
        if let Some(scanned) = scan_audio_file(path) {
            updated_tracks.push(scanned);
        }
    }

    if updated_tracks.is_empty() && !errors.is_empty() {
        return Err(format!("Falló la edición por lotes: {}", errors.join("; ")));
    }

    Ok(updated_tracks)
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
