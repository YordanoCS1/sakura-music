use parking_lot::{Condvar, Mutex};
use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::Emitter;

use crate::paths;

/// Lee la salida de yt-dlp línea por línea sin exigir UTF-8 válido.
/// En Windows los títulos pueden venir en otra codificación; reemplazamos
/// los bytes inválidos en lugar de abortar la búsqueda o la playlist.
struct LineasTolerantes<R: std::io::Read> {
    reader: BufReader<R>,
    buffer: Vec<u8>,
}

impl<R: std::io::Read> LineasTolerantes<R> {
    fn new(reader: R) -> Self {
        Self {
            reader: BufReader::new(reader),
            buffer: Vec::new(),
        }
    }
}

impl<R: std::io::Read> Iterator for LineasTolerantes<R> {
    type Item = std::io::Result<String>;

    fn next(&mut self) -> Option<Self::Item> {
        self.buffer.clear();
        match self.reader.read_until(b'\n', &mut self.buffer) {
            Ok(0) => None,
            Ok(_) => Some(Ok(String::from_utf8_lossy(&self.buffer)
                .trim_end_matches(['\r', '\n'])
                .to_string())),
            Err(error) => Some(Err(error)),
        }
    }
}

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

#[derive(Serialize, Clone, Debug)]
pub struct OnlineSearchEvent {
    pub request_id: String,
    pub result: OnlineSearchResult,
}

#[derive(Serialize, Clone, Debug)]
pub struct PlaylistItemEvent {
    pub request_id: String,
    pub title: String,
    pub uploader: String,
    pub item: OnlineSearchResult,
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

/// Coordina los trabajos de descarga: limita cuántos corren a la vez, permite
/// cancelarlos y guarda los PIDs para matarlos al cerrar la app.
pub struct DownloadManager {
    inner: Mutex<ManagerInner>,
    cv: Condvar,
}

struct ManagerInner {
    active: usize,
    max_concurrent: usize,
    pids: HashMap<String, u32>,
    cancelled: HashSet<String>,
    jobs: HashSet<String>,
    job_keys: HashMap<String, (String, String, String)>,
    active_keys: HashSet<(String, String, String)>,
}

impl DownloadManager {
    pub fn new(max_concurrent: usize) -> Self {
        Self {
            inner: Mutex::new(ManagerInner {
                active: 0,
                max_concurrent: max_concurrent.max(1),
                pids: HashMap::new(),
                cancelled: HashSet::new(),
                jobs: HashSet::new(),
                job_keys: HashMap::new(),
                active_keys: HashSet::new(),
            }),
            cv: Condvar::new(),
        }
    }

    fn register_job(&self, job_id: &str, url: &str, output_folder: &str, format: &str) -> bool {
        let url_key = extract_video_id(url)
            .map(|id| format!("youtube:{}", id))
            .unwrap_or_else(|| url.trim().to_string());
        let mut folder_key = PathBuf::from(output_folder)
            .components()
            .collect::<PathBuf>()
            .to_string_lossy()
            .to_string();
        if cfg!(windows) {
            folder_key = folder_key.to_lowercase();
        }
        let key = (url_key, folder_key, format.trim().to_ascii_lowercase());

        let mut inner = self.inner.lock();
        if inner.jobs.contains(job_id) || inner.active_keys.contains(&key) {
            return false;
        }
        inner.jobs.insert(job_id.to_string());
        inner.job_keys.insert(job_id.to_string(), key.clone());
        inner.active_keys.insert(key);
        true
    }

    /// Espera un turno. Devuelve `false` si el trabajo se canceló mientras
    /// estaba en cola.
    pub fn acquire(&self, job_id: &str) -> bool {
        let mut inner = self.inner.lock();
        while inner.active >= inner.max_concurrent && !inner.cancelled.contains(job_id) {
            // `wait` readquiere el mutex en el mismo guardia y devuelve ().
            self.cv.wait(&mut inner);
        }
        if inner.cancelled.contains(job_id) {
            inner.cancelled.remove(job_id);
            return false;
        }
        inner.active += 1;
        true
    }

    pub fn release(&self) {
        let mut inner = self.inner.lock();
        inner.active = inner.active.saturating_sub(1);
        self.cv.notify_all();
    }

    pub fn register_pid(&self, job_id: &str, pid: u32) {
        let mut inner = self.inner.lock();
        if inner.cancelled.contains(job_id) {
            // La cancelación llegó después de lanzar el proceso pero antes de
            // registrar su PID: hay que matarlo enseguida para que no siga bajando.
            drop(inner);
            kill_pid(pid);
            return;
        }
        inner.pids.insert(job_id.to_string(), pid);
    }

    pub fn unregister_pid(&self, job_id: &str) {
        self.inner.lock().pids.remove(job_id);
    }

    pub fn is_cancelled(&self, job_id: &str) -> bool {
        self.inner.lock().cancelled.contains(job_id)
    }

    pub fn finish(&self, job_id: &str) {
        let mut inner = self.inner.lock();
        inner.pids.remove(job_id);
        inner.cancelled.remove(job_id);
        inner.jobs.remove(job_id);
        if let Some(key) = inner.job_keys.remove(job_id) {
            inner.active_keys.remove(&key);
        }
    }

    pub fn cancel(&self, job_id: &str) -> bool {
        let pid = {
            let mut inner = self.inner.lock();
            if !inner.jobs.contains(job_id) {
                return false;
            }
            inner.cancelled.insert(job_id.to_string());
            inner.pids.get(job_id).copied()
        };
        if let Some(pid) = pid {
            kill_pid(pid);
        }
        true
    }

    pub fn cancel_all(&self) {
        let pids: Vec<u32> = {
            let mut inner = self.inner.lock();
            let job_ids: Vec<String> = inner.jobs.iter().cloned().collect();
            for job_id in job_ids {
                inner.cancelled.insert(job_id);
            }
            inner.pids.values().copied().collect()
        };
        for pid in pids {
            kill_pid(pid);
        }
    }
}

#[cfg(windows)]
fn kill_pid(pid: u32) {
    let _ = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

#[cfg(not(windows))]
fn kill_pid(pid: u32) {
    let _ = Command::new("kill")
        .args(["-9", &pid.to_string()])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

#[cfg(windows)]
fn which_binary(name: &str) -> Option<PathBuf> {
    let output = Command::new("where.exe").arg(name).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .next()
        .map(|line| PathBuf::from(line.trim()))
        .filter(|path| path.exists())
}

#[cfg(not(windows))]
fn which_binary(name: &str) -> Option<PathBuf> {
    let output = Command::new("which").arg(name).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .next()
        .map(|line| PathBuf::from(line.trim()))
        .filter(|path| path.exists())
}

fn binary_name(base: &str) -> String {
    if cfg!(windows) {
        format!("{}.exe", base)
    } else {
        base.to_string()
    }
}

fn configure_ytdlp_temp_dir(cmd: &mut Command) -> Result<(), String> {
    let temp_dir = paths::data_dir().join("yt-dlp-temp");
    std::fs::create_dir_all(&temp_dir).map_err(|error| {
        format!(
            "No se pudo preparar la carpeta temporal de yt-dlp {}: {}",
            temp_dir.display(),
            error
        )
    })?;
    cmd.env("TEMP", &temp_dir)
        .env("TMP", &temp_dir)
        .env("TMPDIR", &temp_dir);
    Ok(())
}

pub fn find_ytdlp_binary() -> Option<PathBuf> {
    // 1. Directorio de datos del usuario (compatibilidad con la v1)
    if let Ok(appdata) = std::env::var("APPDATA") {
        let p = PathBuf::from(appdata)
            .join("sakura-music")
            .join("bin")
            .join(binary_name("yt-dlp"));
        if p.exists() {
            return Some(p);
        }
    }

    // 2. Carpeta de datos de la app: los binarios se actualizan sin tocar el PATH.
    let local = paths::bin_dir().join(binary_name("yt-dlp"));
    if local.exists() {
        return Some(local);
    }

    // 3. PATH del sistema, por si yt-dlp ya está instalado globalmente.
    which_binary("yt-dlp")
}

pub fn find_ffmpeg_binary() -> Option<PathBuf> {
    // 1. Carpeta de datos de la app: es la ubicación preferida y la más estable.
    let local = paths::bin_dir().join(binary_name("ffmpeg"));
    if local.exists() {
        return Some(local);
    }

    // 2. Instalación histórica de la v1
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let legacy = PathBuf::from(&local_appdata)
            .join("SakuraMusic")
            .join("bin")
            .join(binary_name("ffmpeg"));
        if legacy.exists() {
            return Some(legacy);
        }

        // 3. Enlaces de winget: rutas forever del paquete instalado por el usuario.
        let winget = PathBuf::from(local_appdata)
            .join("Microsoft")
            .join("WinGet")
            .join("Links")
            .join(binary_name("ffmpeg"));
        if winget.exists() {
            return Some(winget);
        }
    }

    // 4. PATH como último recurso, antes de informar que falta la herramienta.
    which_binary("ffmpeg")
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

fn parse_result_line(line: &str) -> Option<(OnlineSearchResult, Option<String>)> {
    let parts: Vec<&str> = line.split("|||").collect();
    if parts.len() < 4 {
        return None;
    }

    let id = parts[0].trim().to_string();
    if id.is_empty() || id == "NA" {
        return None;
    }

    let title = parts[1].trim().to_string();
    let uploader = parts[2].trim().to_string();
    let duration = parts[3].trim().to_string();
    let thumbnail = parts
        .get(4)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty() && s != "NA");
    let playlist_title = parts
        .get(5)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty() && s != "NA");
    let url = format!("https://www.youtube.com/watch?v={}", id);

    Some((
        OnlineSearchResult {
            id,
            title,
            uploader,
            duration,
            thumbnail,
            url,
        },
        playlist_title,
    ))
}

pub fn search_youtube(
    app: &tauri::AppHandle,
    request_id: &str,
    query: &str,
) -> Result<Vec<OnlineSearchResult>, String> {
    let ytdlp = find_ytdlp_binary().ok_or_else(|| {
        "yt-dlp no encontrado. Instalalo desde Ajustes > Herramientas de descarga.".to_string()
    })?;

    let search_arg = if query.starts_with("http://") || query.starts_with("https://") {
        query.to_string()
    } else {
        format!("ytsearch10:{}", query)
    };

    let mut cmd = Command::new(ytdlp);
    configure_ytdlp_temp_dir(&mut cmd)?;
    cmd.args([
        "--flat-playlist",
        "--print",
        "%(id)s|||%(title)s|||%(uploader)s|||%(duration_string)s|||%(thumbnail)s",
        &search_arg,
    ]);

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd
        .spawn()
        .map_err(|error| format!("Fallo al ejecutar búsqueda: {}", error))?;
    let stderr = child.stderr.take();
    let stderr_thread = std::thread::spawn(move || {
        let mut output = String::new();
        if let Some(stderr) = stderr {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                if output.len() < 8_000 {
                    output.push_str(&line);
                    output.push('\n');
                }
            }
        }
        output
    });

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "No se pudo leer la salida de búsqueda de yt-dlp".to_string())?;
    let mut results = Vec::new();
    for line in LineasTolerantes::new(stdout) {
        let line = match line {
            Ok(line) => line,
            Err(error) => {
                let _ = child.kill();
                return Err(format!("Error al leer resultados de yt-dlp: {}", error));
            }
        };
        let Some((result, _)) = parse_result_line(&line) else {
            continue;
        };
        if let Err(error) = app.emit(
            "online-search-result",
            OnlineSearchEvent {
                request_id: request_id.to_string(),
                result: result.clone(),
            },
        ) {
            let _ = child.kill();
            return Err(format!(
                "No se pudo enviar un resultado de búsqueda: {}",
                error
            ));
        }
        results.push(result);
    }

    let status = child
        .wait()
        .map_err(|error| format!("No se pudo finalizar búsqueda de yt-dlp: {}", error))?;
    let stderr = stderr_thread.join().unwrap_or_default();
    if !status.success() {
        return Err(format!("Error en búsqueda: {}", stderr.trim()));
    }
    Ok(results)
}

pub fn resolve_playlist(
    app: &tauri::AppHandle,
    request_id: &str,
    url: &str,
) -> Result<PlaylistInfo, String> {
    let ytdlp = find_ytdlp_binary().ok_or_else(|| {
        "yt-dlp no encontrado. Instalalo desde Ajustes > Herramientas de descarga.".to_string()
    })?;

    let mut cmd = Command::new(ytdlp);
    configure_ytdlp_temp_dir(&mut cmd)
        .map_err(|error| format!("Error al resolver playlist: {}", error))?;
    cmd.args([
        "--flat-playlist",
        "--print",
        "%(id)s|||%(title)s|||%(uploader)s|||%(duration_string)s|||%(thumbnail)s|||%(playlist_title)s",
        url,
    ]);

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd
        .spawn()
        .map_err(|error| format!("Fallo al consultar lista con yt-dlp: {}", error))?;
    let stderr = child.stderr.take();
    let stderr_thread = std::thread::spawn(move || {
        let mut output = String::new();
        if let Some(stderr) = stderr {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                if output.len() < 8_000 {
                    output.push_str(&line);
                    output.push('\n');
                }
            }
        }
        output
    });

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "No se pudo leer la salida de la playlist".to_string())?;
    let mut items = Vec::new();
    let mut detected_title = String::new();
    let mut detected_uploader = String::new();

    for line in LineasTolerantes::new(stdout) {
        let line = match line {
            Ok(line) => line,
            Err(error) => {
                let _ = child.kill();
                return Err(format!("Error al leer pistas de la playlist: {}", error));
            }
        };
        if let Some((item, playlist_title)) = parse_result_line(&line) {
            if detected_title.is_empty()
                && let Some(title) = playlist_title
            {
                detected_title = title;
            }
            if detected_uploader.is_empty() && !item.uploader.is_empty() && item.uploader != "NA" {
                detected_uploader = item.uploader.clone();
            }
            if let Err(error) = app.emit(
                "playlist-item",
                PlaylistItemEvent {
                    request_id: request_id.to_string(),
                    title: if detected_title.is_empty() {
                        "Playlist / Álbum".to_string()
                    } else {
                        detected_title.clone()
                    },
                    uploader: detected_uploader.clone(),
                    item: item.clone(),
                },
            ) {
                let _ = child.kill();
                return Err(format!(
                    "No se pudo enviar una pista de la playlist: {}",
                    error
                ));
            }
            items.push(item);
        }
    }

    let status = child
        .wait()
        .map_err(|error| format!("No se pudo finalizar consulta de playlist: {}", error))?;
    let stderr = stderr_thread.join().unwrap_or_default();
    if !status.success() {
        return Err(format!("Error al resolver playlist: {}", stderr.trim()));
    }

    if items.is_empty() {
        return Err(
            "No se encontraron pistas en la lista o el enlace no es accesible.".to_string(),
        );
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

fn parse_progress_line(line: &str) -> Option<(f32, String, String, String)> {
    let rest = line.strip_prefix("sakuradl|")?;
    let parts: Vec<&str> = rest.split('|').collect();
    if parts.len() < 4 {
        return None;
    }

    let pct = parts[0]
        .replace('%', "")
        .trim()
        .parse::<f32>()
        .unwrap_or(0.0);
    let speed = parts[1].trim().to_string();
    let eta = parts[2].trim().to_string();
    let status = if parts[3].trim() == "finished" {
        "convirtiendo audio".to_string()
    } else {
        "descargando".to_string()
    };

    Some((pct, speed, eta, status))
}

fn extract_video_id(url: &str) -> Option<String> {
    if let Some(pos) = url.find("v=") {
        let rest = &url[pos + 2..];
        let id = rest.split(['&', '?', '#']).next().unwrap_or(rest);
        if !id.is_empty() {
            return Some(id.to_string());
        }
    }
    if let Some(pos) = url.find("youtu.be/") {
        let rest = &url[pos + 9..];
        let id = rest.split(['?', '&', '#']).next().unwrap_or(rest);
        if !id.is_empty() {
            return Some(id.to_string());
        }
    }
    None
}

fn find_downloaded_file(dir: &Path, url: &str) -> Option<String> {
    let id = extract_video_id(url)?;
    let marker = format!("[{}]", id);
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;

    for entry in std::fs::read_dir(dir).ok()?.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = path.file_name()?.to_string_lossy();
        if !name.contains(&marker) {
            continue;
        }
        let modified = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .unwrap_or(std::time::UNIX_EPOCH);
        if best.as_ref().is_none_or(|(time, _)| modified >= *time) {
            best = Some((modified, path));
        }
    }

    best.map(|(_, path)| path.to_string_lossy().to_string())
}

fn emit_progress(
    app: &tauri::AppHandle,
    id: &str,
    progress: f32,
    speed: &str,
    eta: &str,
    status: &str,
    file_path: Option<String>,
) {
    let _ = app.emit(
        "download-progress",
        DownloadProgressEvent {
            id: id.to_string(),
            progress,
            speed: speed.to_string(),
            eta: eta.to_string(),
            status: status.to_string(),
            file_path,
        },
    );
}

pub fn execute_download(
    app: tauri::AppHandle,
    manager: Arc<DownloadManager>,
    job_id: String,
    url: String,
    format_opt: String,
    output_folder: String,
) -> Result<(), String> {
    if !manager.register_job(&job_id, &url, &output_folder, &format_opt) {
        return Err("Ya existe una descarga activa para esta pista y carpeta.".to_string());
    }
    std::thread::spawn(move || {
        if !manager.acquire(&job_id) {
            emit_progress(&app, &job_id, 0.0, "--", "--", "cancelado", None);
            manager.finish(&job_id);
            return;
        }

        run_download(&app, &manager, &job_id, &url, &format_opt, &output_folder);

        manager.release();
        manager.finish(&job_id);
    });
    Ok(())
}

fn run_download(
    app: &tauri::AppHandle,
    manager: &DownloadManager,
    job_id: &str,
    url: &str,
    format_opt: &str,
    output_folder: &str,
) {
    let ytdlp = match find_ytdlp_binary() {
        Some(path) => path,
        None => {
            emit_progress(
                app,
                job_id,
                0.0,
                "--",
                "--",
                "error: yt-dlp no encontrado",
                None,
            );
            return;
        }
    };

    let mut cmd = Command::new(ytdlp);
    if let Err(error) = configure_ytdlp_temp_dir(&mut cmd) {
        emit_progress(
            app,
            job_id,
            0.0,
            "--",
            "--",
            &format!("error: {}", error),
            None,
        );
        return;
    }

    let out_dir = Path::new(output_folder);
    let _ = std::fs::create_dir_all(out_dir);

    let out_template = out_dir
        .join("%(title)s [%(id)s].%(ext)s")
        .to_string_lossy()
        .to_string();

    cmd.arg(url);
    cmd.args(["-o", &out_template]);
    cmd.arg("--extract-audio");
    cmd.arg("--continue");

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
    cmd.args(["--no-playlist", "--windows-filenames"]);
    cmd.args([
        "--socket-timeout",
        "30",
        "--retries",
        "3",
        "--fragment-retries",
        "3",
    ]);
    cmd.args([
        "--newline",
        "--progress-template",
        "sakuradl|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.status)s",
    ]);
    // yt-dlp imprime la ruta final; así el frontend sabe qué archivo quedó.
    cmd.args(["--print", "after_move:filepath", "--no-simulate"]);

    if let Some(ffmpeg) = find_ffmpeg_binary()
        && let Some(parent) = ffmpeg.parent()
    {
        cmd.args(["--ffmpeg-location", &parent.to_string_lossy()]);
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(err) => {
            emit_progress(
                app,
                job_id,
                0.0,
                "--",
                "--",
                &format!("error al iniciar: {}", err),
                None,
            );
            return;
        }
    };

    manager.register_pid(job_id, child.id());

    let stderr = child.stderr.take();
    let stderr_thread = std::thread::spawn(move || {
        let mut buffer = String::new();
        if let Some(stderr) = stderr {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                if buffer.len() < 8_000 {
                    buffer.push_str(&line);
                    buffer.push('\n');
                }
            }
        }
        buffer
    });

    let mut final_path: Option<String> = None;
    if let Some(stdout) = child.stdout.take() {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Some((pct, speed, eta, status)) = parse_progress_line(&line) {
                emit_progress(app, job_id, pct, &speed, &eta, &status, None);
            } else {
                let trimmed = line.trim();
                if trimmed.contains(":\\") || trimmed.starts_with('/') {
                    final_path = Some(trimmed.to_string());
                }
            }
        }
    }

    let status = child.wait();
    manager.unregister_pid(job_id);
    let stderr_text = stderr_thread.join().unwrap_or_default();

    if manager.is_cancelled(job_id) {
        emit_progress(app, job_id, 0.0, "--", "--", "cancelado", None);
        return;
    }

    match status {
        Ok(status) if status.success() => {
            let file_path = final_path.or_else(|| find_downloaded_file(out_dir, url));
            emit_progress(app, job_id, 100.0, "--", "00:00", "completado", file_path);
        }
        _ => {
            let detail = stderr_text
                .lines()
                .rev()
                .find(|line| !line.trim().is_empty())
                .unwrap_or("")
                .trim()
                .to_string();
            let status = if detail.is_empty() {
                "error al procesar".to_string()
            } else {
                format!("error: {}", detail)
            };
            emit_progress(app, job_id, 0.0, "--", "--", &status, None);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lee_lineas_con_bytes_no_utf8() {
        let datos = b"id1|||Canci\xf3n|||Canal|||3:45|||NA\r\nid2|||Otra|||Canal|||2:10|||NA\n";
        let lineas: Vec<String> = LineasTolerantes::new(&datos[..])
            .map(|linea| linea.expect("debería leer la línea"))
            .collect();
        assert_eq!(lineas.len(), 2);
        // El byte 0xf3 (ó en Latin-1) se reemplaza, pero no aborta la lectura.
        assert!(lineas[0].starts_with("id1|||Canci"));
        assert_eq!(lineas[1], "id2|||Otra|||Canal|||2:10|||NA");
    }

    #[test]
    fn parsea_linea_de_busqueda() {
        let line = "abc123|||Una canción|||Canal|||3:45|||https://img.example/thumb.jpg";
        let (result, playlist) = parse_result_line(line).expect("debería parsear");
        assert_eq!(result.id, "abc123");
        assert_eq!(result.title, "Una canción");
        assert_eq!(result.uploader, "Canal");
        assert_eq!(result.duration, "3:45");
        assert_eq!(
            result.thumbnail.as_deref(),
            Some("https://img.example/thumb.jpg")
        );
        assert_eq!(result.url, "https://www.youtube.com/watch?v=abc123");
        assert!(playlist.is_none());
    }

    #[test]
    fn ignora_lineas_incompletas_o_na() {
        assert!(parse_result_line("NA|||x|||y").is_none());
        assert!(parse_result_line("id|||titulo").is_none());
    }

    #[test]
    fn parsea_progreso() {
        let (pct, speed, eta, status) =
            parse_progress_line("sakuradl| 42.5%|1.2MiB/s|00:12|downloading")
                .expect("debería parsear");
        assert!((pct - 42.5).abs() < f32::EPSILON);
        assert_eq!(speed, "1.2MiB/s");
        assert_eq!(eta, "00:12");
        assert_eq!(status, "descargando");
    }

    #[test]
    fn progreso_finished_pasa_a_convirtiendo() {
        let (_, _, _, status) = parse_progress_line("sakuradl|100%|--|00:00|finished").unwrap();
        assert_eq!(status, "convirtiendo audio");
    }

    #[test]
    fn extrae_id_de_urls_conocidas() {
        assert_eq!(
            extract_video_id("https://www.youtube.com/watch?v=abc123&list=x").as_deref(),
            Some("abc123")
        );
        assert_eq!(
            extract_video_id("https://youtu.be/xyz789?t=10").as_deref(),
            Some("xyz789")
        );
        assert_eq!(extract_video_id("https://example.com/video"), None);
    }

    #[test]
    fn rechaza_duplicados_activos_y_permite_reintentar_al_terminar() {
        let manager = DownloadManager::new(1);
        assert!(manager.register_job(
            "first",
            "https://www.youtube.com/watch?v=abc123",
            r"C:\Music",
            "FLAC",
        ));
        assert!(!manager.register_job(
            "duplicate",
            "https://www.youtube.com/watch?v=abc123&list=PL1",
            r"c:\music",
            "flac",
        ));
        assert!(manager.register_job(
            "other-format",
            "https://www.youtube.com/watch?v=abc123",
            r"C:\Music",
            "MP3",
        ));
        manager.finish("other-format");

        assert!(manager.cancel("first"));
        assert!(!manager.acquire("first"));
        manager.finish("first");
        assert!(manager.register_job(
            "retry",
            "https://www.youtube.com/watch?v=abc123",
            r"C:\Music",
            "FLAC",
        ));
    }
}
