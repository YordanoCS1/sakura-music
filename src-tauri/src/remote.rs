//! Control remoto local: servidor HTTP mínimo para manejar la reproducción
//! desde el teléfono móvil en la misma red. Usa sólo `std`, sin crates extra.

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};
use std::thread;
use tauri::Emitter;

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
}

pub struct Remote {
    pub activo: AtomicBool,
    pub estado: Mutex<RemoteState>,
}

static REMOTO: OnceLock<Arc<Remote>> = OnceLock::new();

pub fn remote() -> &'static Arc<Remote> {
    REMOTO.get_or_init(|| {
        Arc::new(Remote {
            activo: AtomicBool::new(false),
            estado: Mutex::new(RemoteState::default()),
        })
    })
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
    let cabecera = format!(
        "HTTP/1.1 {codigo}\r\nContent-Type: {tipo}; charset=utf-8\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
        cuerpo.len()
    );
    let _ = stream.write_all(cabecera.as_bytes());
    let _ = stream.write_all(cuerpo.as_bytes());
}

fn emitir(app: &tauri::AppHandle, comando: RemoteCommand) {
    let _ = app.emit("remote-command", comando);
}

fn atender(mut stream: TcpStream, app: &tauri::AppHandle) {
    let mut buffer = [0u8; 8192];
    let leidos = stream.read(&mut buffer).unwrap_or(0);
    if leidos == 0 {
        return;
    }
    let peticion = String::from_utf8_lossy(&buffer[..leidos]).to_string();
    let primera = peticion.lines().next().unwrap_or("");
    let partes: Vec<&str> = primera.split_whitespace().collect();
    let metodo = partes.first().copied().unwrap_or("GET");
    let objetivo = partes.get(1).copied().unwrap_or("/");
    let (ruta, consulta) = objetivo.split_once('?').unwrap_or((objetivo, ""));

    if !remote().activo.load(Ordering::Relaxed) {
        responder(
            &mut stream,
            "200",
            "text/html",
            "<h1 style='font-family:system-ui'>Control remoto desactivado</h1><p>Activalo en Ajustes → Control remoto.</p>",
        );
        return;
    }

    match (metodo, ruta) {
        ("GET", "/") => responder(&mut stream, "200", "text/html", pagina()),
        ("GET", "/api/status") => {
            let estado = remote().estado.lock().clone();
            let json = serde_json::to_string(&estado).unwrap_or_else(|_| "{}".to_string());
            responder(&mut stream, "200", "application/json", &json);
        }
        ("GET", "/api/search") => {
            let q = parametro(consulta, "q").unwrap_or_default();
            let resultados = crate::library_db::search_tracks(&q, 20).unwrap_or_default();
            let json = serde_json::to_string(&resultados).unwrap_or_else(|_| "[]".to_string());
            responder(&mut stream, "200", "application/json", &json);
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
}
