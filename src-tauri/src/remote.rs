//! Control remoto local: servidor HTTP para manejar la app desde el celular.
//! Usa sólo `std`, sin crates extra. Todo lo que no sea leer el estado o
//! emitir comandos se resuelve en el frontend de la PC, que sigue siendo el
//! único que toca archivos y SQLite.

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, UdpSocket};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, OnceLock};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};

pub const PUERTO: u16 = 17342;

#[derive(Clone, Serialize, Deserialize)]
pub struct RemoteState {
    pub title: String,
    pub artist: String,
    pub playing: bool,
    pub position: f64,
    pub duration: f64,
}

impl Default for RemoteState {
    fn default() -> Self {
        Self {
            title: String::new(),
            artist: String::new(),
            playing: false,
            position: 0.0,
            duration: 0.0,
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum RemoteCommand {
    PlayPause,
    Pause,
    Next,
    Previous,
    PlayTrack {
        track: Box<crate::scanner::ScannedTrack>,
    },
    SetVolume {
        value: f64,
    },
    Seek {
        seconds: f64,
    },
    /// Ejecuta un comando Tauri en la PC y devuelve el resultado por `id`.
    Invoke {
        id: String,
        cmd: String,
        args: Value,
    },
}

pub struct Remote {
    pub activo: AtomicBool,
    pub estado: Mutex<RemoteState>,
    /// PIN de 6 dígitos que se muestra en Ajustes y viaja en el QR.
    pin: Mutex<String>,
    /// Tokens de sesión emitidos después de validar el PIN.
    sesiones: Mutex<HashSet<String>>,
    /// Canales de espera para los comandos reenviados a la PC.
    respuestas: Mutex<HashMap<String, mpsc::Sender<Result<Value, String>>>>,
}

static REMOTO: OnceLock<Arc<Remote>> = OnceLock::new();
static CONTADOR: AtomicU64 = AtomicU64::new(0);

pub fn remote() -> &'static Arc<Remote> {
    REMOTO.get_or_init(|| {
        Arc::new(Remote {
            activo: AtomicBool::new(false),
            estado: Mutex::new(RemoteState::default()),
            pin: Mutex::new(String::new()),
            sesiones: Mutex::new(HashSet::new()),
            respuestas: Mutex::new(HashMap::new()),
        })
    })
}

/// Mezcla tiempo y contador. No es criptográfico: alcanza para evitar que
/// cualquiera en la Wi-Fi entre accidentalmente al control remoto.
fn semilla() -> u64 {
    let nano = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0);
    let n = CONTADOR.fetch_add(1, Ordering::Relaxed);
    nano.wrapping_mul(6_364_136_223_846_793_005)
        .wrapping_add(n.wrapping_mul(1_442_695_040_888_963_407))
}

fn generar_pin() -> String {
    format!("{:06}", semilla() % 1_000_000)
}

fn generar_token() -> String {
    format!("{:016x}{:016x}", semilla(), semilla())
}

/// Activa o desactiva el servidor. Al activar genera un PIN nuevo sólo si no
/// había uno; al desactivar lo descarta junto con todas las sesiones.
pub fn set_activo(activo: bool) {
    let r = remote();
    r.activo.store(activo, Ordering::Relaxed);
    let mut pin = r.pin.lock();
    let mut sesiones = r.sesiones.lock();
    if activo {
        if pin.is_empty() {
            *pin = generar_pin();
        }
    } else {
        pin.clear();
        sesiones.clear();
    }
}

/// PIN vigente. Se expone al frontend para mostrarlo y armar el QR.
pub fn pin_actual() -> String {
    remote().pin.lock().clone()
}

/// Arranca el servidor una sola vez. Si el puerto está ocupado, devuelve error
/// pero no impide que la app arranque (el llamador decide cómo avisar).
pub fn iniciar(app: tauri::AppHandle) -> Result<(), String> {
    let listener = TcpListener::bind(("0.0.0.0", PUERTO))
        .map_err(|error| format!("No se pudo abrir el puerto {PUERTO}: {error}"))?;
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            atender(stream, &app);
        }
    });
    Ok(())
}

pub fn ip_local() -> String {
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0")
        && socket.connect("8.8.8.8:80").is_ok()
        && let Ok(direccion) = socket.local_addr()
    {
        return direccion.ip().to_string();
    }
    "127.0.0.1".to_string()
}

fn parametro(consulta: &str, clave: &str) -> Option<String> {
    consulta.split('&').find_map(|par| {
        let (k, v) = par.split_once('=')?;
        if k == clave {
            Some(v.to_string())
        } else {
            None
        }
    })
}

fn responder(stream: &mut TcpStream, codigo: &str, tipo: &str, cuerpo: &str) {
    responder_extra(stream, codigo, tipo, cuerpo.as_bytes(), "");
}

fn responder_bytes(stream: &mut TcpStream, codigo: &str, tipo: &str, cuerpo: &[u8]) {
    responder_extra(stream, codigo, tipo, cuerpo, "");
}

fn responder_extra(stream: &mut TcpStream, codigo: &str, tipo: &str, cuerpo: &[u8], extra: &str) {
    let cabecera = format!(
        "HTTP/1.1 {codigo}\r\nContent-Type: {tipo}; charset=utf-8\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-store\r\n{extra}Connection: close\r\n\r\n",
        cuerpo.len()
    );
    let _ = stream.write_all(cabecera.as_bytes());
    let _ = stream.write_all(cuerpo);
}

fn cookie_token(cabeceras: &str) -> Option<String> {
    cabeceras.lines().find_map(|linea| {
        let (clave, valor) = linea.split_once(':')?;
        if !clave.trim().eq_ignore_ascii_case("cookie") {
            return None;
        }
        valor
            .split(';')
            .find_map(|par| par.trim().strip_prefix("sakura_remote="))
            .map(str::to_string)
    })
}

fn sesion_valida(cabeceras: &str) -> bool {
    cookie_token(cabeceras)
        .map(|token| remote().sesiones.lock().contains(&token))
        .unwrap_or(false)
}

fn abrir_sesion() -> String {
    let token = generar_token();
    remote().sesiones.lock().insert(token.clone());
    token
}

fn pagina_login(error: bool) -> String {
    let aviso = if error {
        "<p style='color:#fbbf24'>PIN incorrecto. Intente de nuevo.</p>"
    } else {
        "<p>Escriba el PIN que aparece en Ajustes → Sistema → Control remoto.</p>"
    };
    format!(
        r#"<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sakura · Control remoto</title><style>
body{{margin:0;background:#14121b;color:#eee9f7;font:15px/1.5 system-ui;display:grid;place-items:center;min-height:100vh;padding:20px}}
.card{{background:#1e1a2b;border:1px solid #332d48;border-radius:16px;padding:24px;width:100%;max-width:340px}}
h1{{font-size:18px;margin:0 0 8px}}small{{color:#a49bbd}}input{{width:100%;box-sizing:border-box;margin:12px 0;padding:12px;border:1px solid #332d48;border-radius:10px;background:#14121b;color:#eee9f7;font:20px/1 'JetBrains Mono',monospace;letter-spacing:6px;text-align:center}}
button{{width:100%;padding:12px;border:0;border-radius:10px;background:#b98cff;color:#14121b;font-weight:700;cursor:pointer}}
</style></head><body><div class="card"><small>SAKURA MUSIC</small><h1>Control remoto</h1>{aviso}
<form method="post" action="/login"><input name="pin" inputmode="numeric" maxlength="6" placeholder="······" autofocus required>
<button type="submit">Entrar</button></form></div></body></html>"#
    )
}

/// Busca el directorio con el frontend compilado. En desarrollo el CWD suele
/// ser `src-tauri`; en un paquete, el ejecutable vive several niveles abajo.
fn buscar_dist() -> Option<PathBuf> {
    let mut candidatos = vec![
        PathBuf::from("dist"),
        PathBuf::from("../dist"),
        PathBuf::from("../../dist"),
    ];
    if let Ok(exe) = std::env::current_exe() {
        for ancestral in exe.ancestors().take(5) {
            candidatos.push(ancestral.join("dist"));
            candidatos.push(ancestral.join("../dist"));
        }
    }
    candidatos
        .into_iter()
        .find(|ruta| ruta.join("index.html").is_file())
}

fn mime(ruta: &Path) -> &'static str {
    match ruta.extension().and_then(|e| e.to_str()).unwrap_or("") {
        "html" => "text/html",
        "js" => "text/javascript",
        "css" => "text/css",
        "json" | "map" => "application/json",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "woff2" => "font/woff2",
        "ico" => "image/x-icon",
        "bmp" => "image/bmp",
        _ => "application/octet-stream",
    }
}

/// Resuelve un archivo dentro de `dist` sin permitir `..` ni rutas absolutas.
fn archivo_seguro(dist: &Path, ruta: &str) -> Option<PathBuf> {
    let relativo = ruta.trim_start_matches('/');
    let relativo = if relativo.is_empty() {
        "index.html"
    } else {
        relativo
    };
    let destino = dist.join(relativo);
    let raiz = dist.canonicalize().ok()?;
    let resultado = destino.canonicalize().ok()?;
    resultado.starts_with(&raiz).then_some(resultado)
}

fn servir_estatico(stream: &mut TcpStream, dist: &Path, ruta: &str) {
    match archivo_seguro(dist, ruta) {
        Some(archivo) => match std::fs::read(&archivo) {
            Ok(bytes) => responder_bytes(stream, "200", mime(&archivo), &bytes),
            Err(_) => responder(stream, "404", "text/plain", "No encontrado"),
        },
        None => responder(stream, "404", "text/plain", "No encontrado"),
    }
}

fn json_o_vacio<T: Serialize>(resultado: Result<T, String>) -> String {
    match resultado {
        Ok(valor) => serde_json::to_string(&valor).unwrap_or_else(|_| "null".to_string()),
        Err(_) => "null".to_string(),
    }
}

/// La app espera un array de pistas, no las entradas internas con `modified_ns`.
fn biblioteca_json() -> String {
    match crate::library_db::cached_tracks() {
        Ok(entradas) => {
            let pistas: Vec<_> = entradas.into_iter().map(|entrada| entrada.track).collect();
            serde_json::to_string(&pistas).unwrap_or_else(|_| "[]".to_string())
        }
        Err(_) => "[]".to_string(),
    }
}

fn servir_cover(stream: &mut TcpStream, id: &str) {
    let track = crate::library_db::track_by_id(id).ok().flatten();
    let ruta = track.and_then(|t| t.cover_url).unwrap_or_default();
    if ruta.is_empty() {
        responder(stream, "404", "text/plain", "Sin carátula");
        return;
    }
    let archivo = PathBuf::from(&ruta);
    match std::fs::read(&archivo) {
        Ok(bytes) => responder_bytes(stream, "200", mime(&archivo), &bytes),
        Err(_) => responder(stream, "404", "text/plain", "Sin carátula"),
    }
}

fn emitir(app: &tauri::AppHandle, comando: RemoteCommand) {
    let _ = app.emit("remote-command", comando);
}

/// Sirve imágenes de la carpeta de datos (carátulas y vistas previas). Sólo se
/// permiten rutas dentro de `covers/` o la carpeta de datos, para que un
/// navegador comprometido no pueda leer archivos arbitrarios del equipo.
fn servir_archivo_datos(stream: &mut TcpStream, ruta: &str) {
    let destino = PathBuf::from(ruta);
    let permitido = [crate::paths::covers_dir(), crate::paths::data_dir()]
        .iter()
        .filter_map(|base| base.canonicalize().ok())
        .any(|base| {
            destino
                .canonicalize()
                .map(|d| d.starts_with(&base))
                .unwrap_or(false)
        });
    if !permitido {
        responder(stream, "403", "text/plain", "Ruta no permitida");
        return;
    }
    match std::fs::read(&destino) {
        Ok(bytes) => responder_bytes(stream, "200", mime(&destino), &bytes),
        Err(_) => responder(stream, "404", "text/plain", "No encontrado"),
    }
}

fn arg<T: serde::de::DeserializeOwned>(args: &Value, clave: &str) -> Result<T, String> {
    args.get(clave)
        .cloned()
        .ok_or_else(|| format!("Falta el argumento {clave}"))
        .and_then(|valor| serde_json::from_value(valor).map_err(|e| e.to_string()))
}

fn arg_opcional<T: serde::de::DeserializeOwned>(args: &Value, clave: &str) -> Option<T> {
    args.get(clave)
        .cloned()
        .and_then(|valor| serde_json::from_value(valor).ok())
}

fn a_valor<T: Serialize>(valor: T) -> Result<Value, String> {
    serde_json::to_value(valor).map_err(|error| error.to_string())
}

/// Devuelve `Some` cuando el comando es de sólo lectura y el servidor puede
/// resolverlo sin acceder al `State` de Tauri. Los demás se reenvían a la PC.
fn leer_directo(cmd: &str, args: &Value, app: &tauri::AppHandle) -> Option<Result<Value, String>> {
    let resultado = match cmd {
        "library_scan_needed" => arg::<String>(args, "folder")
            .and_then(|carpeta| {
                crate::validacion::ruta(&carpeta, "Carpeta de biblioteca")?;
                crate::library_db::scan_needed(&carpeta)
            })
            .and_then(a_valor),
        "get_cached_library" => {
            let pistas: Vec<_> = crate::library_db::cached_tracks()
                .map(|entradas| entradas.into_iter().map(|e| e.track).collect())
                .unwrap_or_default();
            a_valor(pistas)
        }
        "search_library_fts" => {
            let consulta = arg::<String>(args, "query").unwrap_or_default();
            let limite = arg_opcional::<usize>(args, "limit").unwrap_or(300).min(500);
            a_valor(crate::library_db::search_tracks(&consulta, limite).unwrap_or_default())
        }
        "get_default_music_dir" => a_valor(
            app.path()
                .audio_dir()
                .ok()
                .filter(|ruta| ruta.exists())
                .map(|ruta| ruta.to_string_lossy().to_string()),
        ),
        "check_downloader_tools" => a_valor(crate::downloader::get_status()),
        "tools_status" => a_valor(crate::tools::estados()),
        "get_download_queue" => a_valor(crate::queue::load_queue()),
        "list_download_history" => {
            a_valor(crate::library_db::list_download_history().unwrap_or_default())
        }
        "doctor_database" => match crate::library_db::doctor_detallado() {
            Ok(valor) => a_valor(valor),
            Err(error) => Err(error),
        },
        "get_system_logs" => {
            let limite = arg_opcional::<usize>(args, "limit").unwrap_or(200);
            a_valor(crate::logging::read_logs(limite).unwrap_or_default())
        }
        "list_playlists" => a_valor(crate::playlists::list().unwrap_or_default()),
        "get_playlist" => {
            let id = arg::<String>(args, "id").unwrap_or_default();
            a_valor(crate::playlists::detail(&id))
        }
        "trash_count" => a_valor(crate::library_db::trash_count().unwrap_or(0)),
        "read_lyrics" => {
            let ruta = arg::<String>(args, "path").unwrap_or_default();
            a_valor(crate::lyrics::read_for(&ruta))
        }
        _ => return None,
    };
    Some(resultado)
}

/// Ejecuta un comando en la PC (que sí tiene los `State` de Tauri) y espera la
/// respuesta por un canal. Así el celular usa exactamente la misma lógica.
fn puente(cmd: &str, args: &Value, app: &tauri::AppHandle) -> Result<Value, String> {
    if let Some(resultado) = leer_directo(cmd, args, app) {
        return resultado;
    }

    let id = generar_token();
    let (tx, rx) = mpsc::channel();
    remote().respuestas.lock().insert(id.clone(), tx);
    emitir(
        app,
        RemoteCommand::Invoke {
            id: id.clone(),
            cmd: cmd.to_string(),
            args: args.clone(),
        },
    );
    let espera = std::time::Duration::from_secs(20);
    let respuesta = rx
        .recv_timeout(espera)
        .unwrap_or_else(|_| Err("La aplicación de escritorio no respondió a tiempo".to_string()));
    remote().respuestas.lock().remove(&id);
    respuesta
}

/// Entrega el resultado de un comando ejecutado en la PC al hilo HTTP que espera.
pub fn responder_invoke(id: &str, resultado: Result<Value, String>) {
    if let Some(tx) = remote().respuestas.lock().remove(id) {
        let _ = tx.send(resultado);
    }
}

fn atender(mut stream: TcpStream, app: &tauri::AppHandle) {
    let mut buffer = [0u8; 16_384];
    let leidos = stream.read(&mut buffer).unwrap_or(0);
    if leidos == 0 {
        return;
    }
    let peticion = String::from_utf8_lossy(&buffer[..leidos]).to_string();
    let (cabeceras, cuerpo) = peticion.split_once("\r\n\r\n").unwrap_or((&peticion, ""));
    let primera = cabeceras.lines().next().unwrap_or("");
    let partes: Vec<&str> = primera.split_whitespace().collect();
    let metodo = partes.first().copied().unwrap_or("GET");
    let objetivo = partes.get(1).copied().unwrap_or("/");
    let (ruta, consulta) = objetivo.split_once('?').unwrap_or((objetivo, ""));

    if !remote().activo.load(Ordering::Relaxed) {
        responder(
            &mut stream,
            "200",
            "text/html",
            "<h1 style='font-family:system-ui'>Control remoto desactivado</h1><p>Activelo en Ajustes → Control remoto.</p>",
        );
        return;
    }

    // El QR lleva el PIN en la URL: lo validamos y transformamos en cookie.
    if let Some(pin) = parametro(consulta, "pin") {
        if pin == pin_actual() {
            let token = abrir_sesion();
            responder_extra(
                &mut stream,
                "302",
                "text/plain",
                b"",
                &format!(
                    "Set-Cookie: sakura_remote={token}; Path=/; HttpOnly; SameSite=Lax\r\nLocation: /\r\n"
                ),
            );
        } else {
            responder(&mut stream, "401", "text/html", &pagina_login(true));
        }
        return;
    }

    // Formulario manual para quien escribió la URL sin el PIN del QR.
    if metodo == "POST" && ruta == "/login" {
        if parametro(cuerpo, "pin").as_deref() == Some(pin_actual().as_str()) {
            let token = abrir_sesion();
            responder_extra(
                &mut stream,
                "302",
                "text/plain",
                b"",
                &format!(
                    "Set-Cookie: sakura_remote={token}; Path=/; HttpOnly; SameSite=Lax\r\nLocation: /\r\n"
                ),
            );
        } else {
            responder(&mut stream, "401", "text/html", &pagina_login(true));
        }
        return;
    }

    if !sesion_valida(cabeceras) {
        if ruta == "/" {
            responder(&mut stream, "200", "text/html", &pagina_login(false));
        } else {
            responder(
                &mut stream,
                "401",
                "application/json",
                "{\"error\":\"no autorizado\"}",
            );
        }
        return;
    }

    match (metodo, ruta) {
        ("GET", "/") | ("GET", "/index.html") => match buscar_dist() {
            Some(dist) => servir_estatico(&mut stream, &dist, "index.html"),
            None => responder(&mut stream, "200", "text/html", pagina()),
        },
        ("GET", "/api/status") => {
            let estado = remote().estado.lock().clone();
            let json = serde_json::to_string(&estado).unwrap_or_else(|_| "{}".to_string());
            responder(&mut stream, "200", "application/json", &json);
        }
        ("GET", "/api/pin") => {
            let json = serde_json::json!({ "pin": pin_actual() }).to_string();
            responder(&mut stream, "200", "application/json", &json);
        }
        ("GET", "/api/library") => {
            responder(&mut stream, "200", "application/json", &biblioteca_json());
        }
        ("GET", "/api/search") => {
            let q = parametro(consulta, "q").unwrap_or_default();
            let json = json_o_vacio(crate::library_db::search_tracks(&q, 20));
            responder(&mut stream, "200", "application/json", &json);
        }
        ("GET", "/api/playlists") => {
            let json = json_o_vacio(crate::playlists::list());
            responder(&mut stream, "200", "application/json", &json);
        }
        ("GET", "/api/queue") => {
            let estado = crate::downloader::get_status();
            let json = serde_json::to_string(&estado).unwrap_or_else(|_| "{}".to_string());
            responder(&mut stream, "200", "application/json", &json);
        }
        ("GET", "/api/doctor") => {
            let json = json_o_vacio(crate::library_db::doctor_detallado());
            responder(&mut stream, "200", "application/json", &json);
        }
        ("GET", ruta) if ruta.starts_with("/api/cover/") => {
            servir_cover(&mut stream, ruta.trim_start_matches("/api/cover/"));
        }
        ("GET", "/api/archivo") => {
            let ruta = parametro(consulta, "path").unwrap_or_default();
            servir_archivo_datos(&mut stream, &ruta);
        }
        ("POST", ruta) if ruta.starts_with("/api/cmd/") => {
            let cmd = ruta.trim_start_matches("/api/cmd/");
            let args: Value =
                serde_json::from_str(cuerpo).unwrap_or_else(|_| serde_json::json!({}));
            match puente(cmd, &args, app) {
                Ok(valor) => responder(&mut stream, "200", "application/json", &valor.to_string()),
                Err(error) => {
                    let json = serde_json::json!({ "error": error }).to_string();
                    responder(&mut stream, "500", "application/json", &json);
                }
            }
        }
        ("POST", "/api/playpause") => {
            emitir(app, RemoteCommand::PlayPause);
            responder(&mut stream, "200", "application/json", "{\"ok\":true}");
        }
        ("POST", "/api/pause") => {
            emitir(app, RemoteCommand::Pause);
            responder(&mut stream, "200", "application/json", "{\"ok\":true}");
        }
        ("POST", "/api/next") => {
            emitir(app, RemoteCommand::Next);
            responder(&mut stream, "200", "application/json", "{\"ok\":true}");
        }
        ("POST", "/api/prev") => {
            emitir(app, RemoteCommand::Previous);
            responder(&mut stream, "200", "application/json", "{\"ok\":true}");
        }
        ("POST", "/api/volume") => {
            if let Some(valor) = parametro(consulta, "value").and_then(|v| v.parse::<f64>().ok()) {
                emitir(
                    app,
                    RemoteCommand::SetVolume {
                        value: valor / 100.0,
                    },
                );
            }
            responder(&mut stream, "200", "application/json", "{\"ok\":true}");
        }
        ("POST", "/api/seek") => {
            if let Some(valor) = parametro(consulta, "value").and_then(|v| v.parse::<f64>().ok()) {
                emitir(app, RemoteCommand::Seek { seconds: valor });
            }
            responder(&mut stream, "200", "application/json", "{\"ok\":true}");
        }
        ("POST", "/api/play") => {
            if let Some(id) = parametro(consulta, "id")
                && let Ok(Some(track)) = crate::library_db::track_by_id(&id)
            {
                emitir(
                    app,
                    RemoteCommand::PlayTrack {
                        track: Box::new(track),
                    },
                );
            }
            responder(&mut stream, "200", "application/json", "{\"ok\":true}");
        }
        ("GET", ruta) => {
            if let Some(dist) = buscar_dist() {
                servir_estatico(&mut stream, &dist, ruta);
            } else {
                responder(&mut stream, "404", "text/plain", "No encontrado");
            }
        }
        _ => responder(&mut stream, "404", "text/plain", "No encontrado"),
    }
}

fn pagina() -> &'static str {
    r#"<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sakura · Control remoto</title><style>
:root{--bg:#14121b;--panel:#1e1a2b;--line:#332d48;--text:#eee9f7;--muted:#a49bbd;--accent:#b98cff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui;padding:18px;max-width:540px;margin:0 auto}
h1{font-size:18px;margin:10px 0 4px}.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;margin:14px 0}
#titulo{font-size:19px;font-weight:700}#artista{color:var(--muted);font-size:13px}
.botones{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
button{background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:12px;padding:14px 6px;font-size:17px;cursor:pointer}
button.principal{background:var(--accent);color:#14121b;border-color:var(--accent)}
input{width:100%;padding:11px;background:var(--bg);border:1px solid var(--line);border-radius:10px;color:var(--text);font-size:14px}
.barra{height:5px;background:var(--line);border-radius:4px;margin-top:12px;overflow:hidden}.barra i{display:block;height:100%;background:var(--accent)}
.item{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);cursor:pointer;font-size:13px}
small{color:var(--muted)}
</style></head><body>
<p><small>SAKURA MUSIC · CONTROL REMOTO</small></p>
<h1 id="titulo">—</h1><div id="artista">Sin pista</div>
<div class="barra"><i id="progreso" style="width:0%"></i></div>
<div class="botones">
<button onclick="accion('prev')">⏮</button><button class="principal" id="play" onclick="accion('playpause')">▶</button>
<button onclick="accion('next')">⏭</button><button onclick="accion('pause')">⏸</button>
</div>
<div class="card"><small>VOLUMEN</small><input type="range" min="0" max="100" onchange="accion('volume?value='+this.value)"></div>
<div class="card"><small>BUSCAR EN LA BIBLIOTECA</small><input id="q" placeholder="Título, artista o álbum" oninput="buscar()"><div id="resultados"></div></div>
<script>
function accion(ruta){fetch('/api/'+ruta,{method:'POST'})}
async function estado(){const r=await fetch('/api/status');const s=await r.json();
 document.getElementById('titulo').textContent=s.title||'—';
 document.getElementById('artista').textContent=s.artist||'Sin pista';
 document.getElementById('play').textContent=s.playing?'⏸':'▶';
 document.getElementById('progreso').style.width=(s.duration?s.position/s.duration*100:0)+'%';}
async function buscar(){const q=document.getElementById('q').value;if(!q.length){document.getElementById('resultados').innerHTML='';return;}
 const r=await fetch('/api/search?q='+encodeURIComponent(q));const items=await r.json();
 document.getElementById('resultados').innerHTML=items.map(t=>`<div class="item" onclick="accion('play?id='+encodeURIComponent('${t.id}'))"><span>${t.title}</span><small>${t.artist}</small></div>`).join('');}
estado();setInterval(estado,1500);
</script></body></html>"#
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parametro_extrae_valores_de_la_consulta() {
        assert_eq!(
            parametro("q=gurenge&limit=5", "q"),
            Some("gurenge".to_string())
        );
        assert_eq!(
            parametro("q=gurenge&limit=5", "limit"),
            Some("5".to_string())
        );
        assert_eq!(parametro("q=gurenge", "id"), None);
    }

    #[test]
    fn la_pagina_incluye_los_controles() {
        let html = pagina();
        assert!(html.contains("playpause"));
        assert!(html.contains("next"));
        assert!(html.contains("prev"));
        assert!(html.contains("/api/search"));
        assert!(html.contains("accion('play?id='"));
    }

    #[test]
    fn el_estado_arranca_vacio() {
        let estado = RemoteState::default();
        assert!(estado.title.is_empty());
        assert!(!estado.playing);
        assert_eq!(estado.position, 0.0);
    }

    #[test]
    fn el_pin_tiene_seis_digitos_y_cambia_al_reactivar() {
        set_activo(true);
        let pin = pin_actual();
        assert_eq!(pin.len(), 6);
        assert!(pin.chars().all(|c| c.is_ascii_digit()));
        set_activo(false);
        assert!(pin_actual().is_empty());
        set_activo(true);
        assert_eq!(pin_actual().len(), 6);
        set_activo(false);
    }

    #[test]
    fn el_cookie_de_sesion_se_extrae_de_las_cabeceras() {
        let cabeceras =
            "GET / HTTP/1.1\r\nHost: localhost\r\nCookie: foo=bar; sakura_remote=abc123\r\n";
        assert_eq!(cookie_token(cabeceras), Some("abc123".to_string()));
        assert_eq!(cookie_token("GET / HTTP/1.1"), None);
    }

    #[test]
    fn la_pagina_de_login_pide_el_pin() {
        assert!(pagina_login(false).contains("name=\"pin\""));
        assert!(pagina_login(true).contains("PIN incorrecto"));
    }

    #[test]
    fn los_argumentos_del_puente_se_extraen_y_validan() {
        let args = serde_json::json!({ "query": "gurenge", "limit": 5 });
        assert_eq!(arg::<String>(&args, "query").unwrap(), "gurenge");
        assert_eq!(arg_opcional::<usize>(&args, "limit"), Some(5));
        assert!(arg::<String>(&args, "falta").is_err());
    }

    #[test]
    fn la_respuesta_del_puente_llega_al_hilo_que_espera() {
        let id = "prueba-respuesta";
        let (tx, rx) = mpsc::channel();
        remote().respuestas.lock().insert(id.to_string(), tx);
        responder_invoke(id, Ok(serde_json::json!({ "ok": true })));
        assert_eq!(
            rx.recv().unwrap().unwrap(),
            serde_json::json!({ "ok": true })
        );
        assert!(!remote().respuestas.lock().contains_key(id));
    }

    #[test]
    fn los_archivos_estaticos_no_pueden_salir_de_dist() {
        let nano = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let base =
            PathBuf::from("target").join(format!("sakura-dist-{}-{nano}", std::process::id()));
        std::fs::create_dir_all(&base).expect("no se pudo crear el directorio de prueba");
        std::fs::write(base.join("index.html"), b"ok").expect("no se pudo escribir el archivo");
        assert!(archivo_seguro(&base, "index.html").is_some());
        assert!(archivo_seguro(&base, "").is_some());
        assert!(archivo_seguro(&base, "../secreto.txt").is_none());
        let _ = std::fs::remove_dir_all(&base);
    }
}
