use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DownloaderStatus {
    pub ytdlp_available: bool,
    pub ffmpeg_available: bool,
    pub ytdlp_path: Option<String>,
    pub ffmpeg_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OnlineSearchResult {
    pub id: String,
    pub title: String,
    pub uploader: String,
    pub duration: String,
    pub thumbnail: Option<String>,
    pub url: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PlaylistInfo {
    pub title: String,
    pub uploader: String,
    pub track_count: usize,
    pub items: Vec<OnlineSearchResult>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DownloadProgressEvent {
    pub id: String,
    pub progress: f32,
    pub speed: String,
    pub eta: String,
    pub status: String,
    pub file_path: Option<String>,
}

pub fn find_ytdlp_binary() -> Option<PathBuf> {
    // 1. Directorio de datos de la app (Roaming sakura-music)
    if let Ok(appdata) = std::env::var("APPDATA") {
        let p = PathBuf::from(appdata).join("sakura-music").join("bin").join("yt-dlp.exe");
        if p.exists() {
            return Some(p);
        }
    }

    // 2. Verificar en .tauri_data/bin/yt-dlp.exe
    if let Ok(mut current) = std::env::current_dir() {
        current.push(".tauri_data");
        current.push("bin");
        current.push("yt-dlp.exe");
        if current.exists() {
            return Some(current);
        }
    }

    // 3. Verificar en PATH
    if let Ok(output) = Command::new("where.exe").arg("yt-dlp").output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = stdout.lines().next() {
                let p = PathBuf::from(first_line.trim());
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }

    None
}

pub fn find_ffmpeg_binary() -> Option<PathBuf> {
    // 1. Ruta de winget detectada en el sistema
    let known_winget = PathBuf::from(r"C:\Users\yordi\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe");
    if known_winget.exists() {
        return Some(known_winget);
    }

    // 2. PATH
    if let Ok(output) = Command::new("where.exe").arg("ffmpeg").output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = stdout.lines().next() {
                let p = PathBuf::from(first_line.trim());
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }

    None
}

pub fn get_status() -> DownloaderStatus {
    let ytdlp = find_ytdlp_binary();
    let ffmpeg = find_ffmpeg_binary();

    DownloaderStatus {
        ytdlp_available: ytdlp.is_some(),
        ffmpeg_available: ffmpeg.is_some(),
        ytdlp_path: ytdlp.map(|p| p.to_string_lossy().to_string()),
        ffmpeg_path: ffmpeg.map(|p| p.to_string_lossy().to_string()),
    }
}

pub fn search_youtube(query: &str) -> Result<Vec<OnlineSearchResult>, String> {
    let ytdlp = find_ytdlp_binary().ok_or_else(|| "yt-dlp no encontrado en el sistema".to_string())?;

    let search_arg = if query.starts_with("http://") || query.starts_with("https://") {
        query.to_string()
    } else {
        format!("ytsearch5:{}", query)
    };

    let mut cmd = Command::new(ytdlp);
    cmd.args([
        "--flat-playlist",
        "--print",
        "%(id)s|||%(title)s|||%(uploader)s|||%(duration_string)s|||%(thumbnail)s",
        &search_arg,
    ]);

    let output = cmd.output().map_err(|e| format!("Fallo al ejecutar búsqueda: {}", e))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Error en búsqueda: {}", err));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split("|||").collect();
        if parts.len() >= 4 {
            let id = parts[0].trim().to_string();
            let title = parts[1].trim().to_string();
            let uploader = parts[2].trim().to_string();
            let duration = parts[3].trim().to_string();
            let thumbnail = parts.get(4).map(|s| s.trim().to_string()).filter(|s| !s.is_empty() && s != &"NA");
            let url = format!("https://www.youtube.com/watch?v={}", id);

            results.push(OnlineSearchResult {
                id,
                title,
                uploader,
                duration,
                thumbnail,
                url,
            });
        }
    }

    Ok(results)
}

pub fn resolve_playlist(url: &str) -> Result<PlaylistInfo, String> {
    let ytdlp = find_ytdlp_binary().ok_or_else(|| "yt-dlp no encontrado en el sistema".to_string())?;

    let mut cmd = Command::new(ytdlp);
    cmd.args([
        "--flat-playlist",
        "--print",
        "%(id)s|||%(title)s|||%(uploader)s|||%(duration_string)s|||%(thumbnail)s|||%(playlist_title)s",
        url,
    ]);

    let output = cmd.output().map_err(|e| format!("Fallo al consultar lista con yt-dlp: {}", e))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Error al resolver playlist: {}", err));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut items = Vec::new();
    let mut detected_title = String::new();
    let mut detected_uploader = String::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split("|||").collect();
        if parts.len() >= 4 {
            let id = parts[0].trim().to_string();
            let title = parts[1].trim().to_string();
            let uploader = parts[2].trim().to_string();
            let duration = parts[3].trim().to_string();
            let thumbnail = parts.get(4).map(|s| s.trim().to_string()).filter(|s| !s.is_empty() && s != &"NA");
            let playlist_title = parts.get(5).map(|s| s.trim().to_string()).filter(|s| !s.is_empty() && s != &"NA");

            if let Some(pt) = playlist_title {
                if detected_title.is_empty() && !pt.is_empty() {
                    detected_title = pt;
                }
            }

            if detected_uploader.is_empty() && !uploader.is_empty() && uploader != "NA" {
                detected_uploader = uploader.clone();
            }

            let item_url = format!("https://www.youtube.com/watch?v={}", id);
            items.push(OnlineSearchResult {
                id,
                title,
                uploader,
                duration,
                thumbnail,
                url: item_url,
            });
        }
    }

    if items.is_empty() {
        return Err("No se encontraron pistas en la lista o el enlace no es accesible.".to_string());
    }

    let final_title = if detected_title.is_empty() {
        "Playlist / Álbum".to_string()
    } else {
        detected_title
    };

    let track_count = items.len();

    Ok(PlaylistInfo {
        title: final_title,
        uploader: detected_uploader,
        track_count,
        items,
    })
}

pub fn execute_download(
    app: tauri::AppHandle,
    job_id: String,
    url: String,
    format_opt: String,
    output_folder: String,
) {
    std::thread::spawn(move || {
        let ytdlp = match find_ytdlp_binary() {
            Some(p) => p,
            None => {
                let _ = app.emit("download-progress", DownloadProgressEvent {
                    id: job_id.clone(),
                    progress: 0.0,
                    speed: "--".to_string(),
                    eta: "--".to_string(),
                    status: "error: yt-dlp no encontrado".to_string(),
                    file_path: None,
                });
                return;
            }
        };

        let out_dir = Path::new(&output_folder);
        let _ = std::fs::create_dir_all(out_dir);

        let out_template = out_dir.join("%(title)s [%(id)s].%(ext)s").to_string_lossy().to_string();

        let mut cmd = Command::new(ytdlp);
        cmd.arg(&url);
        cmd.args(["-o", &out_template]);
        cmd.arg("--extract-audio");

        let fmt_lower = format_opt.to_lowercase();
        if fmt_lower.contains("flac") {
            cmd.args(["--audio-format", "flac", "--audio-quality", "0"]);
        } else if fmt_lower.contains("opus") {
            cmd.args(["--audio-format", "opus", "--audio-quality", "0"]);
        } else if fmt_lower.contains("m4a") || fmt_lower.contains("aac") {
            cmd.args(["--audio-format", "m4a", "--audio-quality", "192k"]);
        } else {
            cmd.args(["--audio-format", "mp3", "--audio-quality", "320k"]);
        }

        cmd.args(["--embed-thumbnail", "--add-metadata"]);
        cmd.args(["--newline", "--progress-template", "sakuradl|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.status)s"]);

        if let Some(ffmpeg) = find_ffmpeg_binary() {
            if let Some(parent) = ffmpeg.parent() {
                cmd.args(["--ffmpeg-location", &parent.to_string_lossy()]);
            }
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit("download-progress", DownloadProgressEvent {
                    id: job_id.clone(),
                    progress: 0.0,
                    speed: "--".to_string(),
                    eta: "--".to_string(),
                    status: format!("error al iniciar: {}", e),
                    file_path: None,
                });
                return;
            }
        };

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line in reader.lines().filter_map(|l| l.ok()) {
                if line.starts_with("sakuradl|") {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 5 {
                        let pct_str = parts[1].replace('%', "").trim().to_string();
                        let pct: f32 = pct_str.parse().unwrap_or(0.0);
                        let speed = parts[2].trim().to_string();
                        let eta = parts[3].trim().to_string();
                        let status_raw = parts[4].trim();

                        let status = if status_raw == "finished" {
                            "convirtiendo audio".to_string()
                        } else {
                            "descargando".to_string()
                        };

                        let _ = app.emit("download-progress", DownloadProgressEvent {
                            id: job_id.clone(),
                            progress: pct,
                            speed,
                            eta,
                            status,
                            file_path: None,
                        });
                    }
                }
            }
        }

        let status = child.wait();
        match status {
            Ok(s) if s.success() => {
                let _ = app.emit("download-progress", DownloadProgressEvent {
                    id: job_id.clone(),
                    progress: 100.0,
                    speed: "--".to_string(),
                    eta: "00:00".to_string(),
                    status: "completado".to_string(),
                    file_path: Some(output_folder.clone()),
                });
            }
            _ => {
                let _ = app.emit("download-progress", DownloadProgressEvent {
                    id: job_id.clone(),
                    progress: 0.0,
                    speed: "--".to_string(),
                    eta: "--".to_string(),
                    status: "error al procesar".to_string(),
                    file_path: None,
                });
            }
        }
    });
}
