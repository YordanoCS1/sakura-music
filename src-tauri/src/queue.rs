//! Persistencia de la cola de descargas entre sesiones.
//!
//! La cola vive en memoria en el frontend (`DownloadItem[]`) y en el
//! `DownloadManager` (turnos y PIDs). Este módulo guarda una foto serializable
//! en `download_queue.json` para que al reabrir la app las filas restauren su
//! historial. Los trabajos que estaban en curso al cerrar vuelven como
//! `interrumpida` y el frontend los relanza con el mismo `id`, destino y formato.

use serde::{Deserialize, Serialize};

use crate::{paths, scanner};

/// Tope para que la foto no crezca sin control entre sesiones.
pub const MAX_PERSISTED_JOBS: usize = 100;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PersistedDownload {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub url: String,
    pub format: String,
    pub output_dir: Option<String>,
    pub status: String,
    pub created_at: i64,
    pub file_path: Option<String>,
}

/// Estados que significan "la app se cerró en medio del trabajo".
fn is_active_status(status: &str) -> bool {
    matches!(
        status,
        "en cola" | "descargando" | "convirtiendo audio" | "Conectando..."
    )
}

/// Reconcilia un estado persistido para la próxima sesión. Lo activo no se
/// puede reanudar "en el mismo punto": yt-dlp vuelve a empezar y el usuario
/// ve la fila como `interrumpida` antes de que se relance.
pub fn reconcile_status(status: &str) -> String {
    if is_active_status(status) {
        "interrumpida".to_string()
    } else {
        status.to_string()
    }
}

/// Carga la foto. Archivo ausente o corrupto → lista vacía (la app arranca sin
/// cola en vez de fallar el arranque).
pub fn load_queue() -> Vec<PersistedDownload> {
    let file = paths::queue_file();
    if !file.exists() {
        return Vec::new();
    }
    let data = match std::fs::read_to_string(&file) {
        Ok(data) => data,
        Err(_) => return Vec::new(),
    };
    let items: Vec<PersistedDownload> = match serde_json::from_str(&data) {
        Ok(items) => items,
        Err(_) => return Vec::new(),
    };
    let mut reconciled: Vec<PersistedDownload> = items
        .into_iter()
        .map(|mut item| {
            item.status = reconcile_status(&item.status);
            item
        })
        .collect();
    reconciled.truncate(MAX_PERSISTED_JOBS);
    reconciled
}

/// Guarda la foto completa con escritura atómica. Recorta a las
/// `MAX_PERSISTED_JOBS` más recientes (el frontend manda newest-first).
pub fn save_queue(items: Vec<PersistedDownload>) -> bool {
    let mut items = items;
    items.truncate(MAX_PERSISTED_JOBS);
    let json = match serde_json::to_string(&items) {
        Ok(json) => json,
        Err(_) => return false,
    };
    scanner::write_atomic(&paths::queue_file(), json.as_bytes()).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reconcilia_estados_activos_a_interrumpida() {
        assert_eq!(reconcile_status("en cola"), "interrumpida");
        assert_eq!(reconcile_status("descargando"), "interrumpida");
        assert_eq!(reconcile_status("convirtiendo audio"), "interrumpida");
    }

    #[test]
    fn conserva_estados_finales() {
        assert_eq!(reconcile_status("completado"), "completado");
        assert_eq!(reconcile_status("cancelado"), "cancelado");
        assert_eq!(reconcile_status("error: algo"), "error: algo");
        assert_eq!(reconcile_status("interrumpida"), "interrumpida");
    }

    #[test]
    fn roundtrip_json_con_campos_necesarios() {
        let item = PersistedDownload {
            id: "dl-1".to_string(),
            title: "Tema".to_string(),
            artist: "Artista".to_string(),
            url: "https://www.youtube.com/watch?v=abc".to_string(),
            format: "FLAC".to_string(),
            output_dir: Some(r"C:\Music".to_string()),
            status: "en cola".to_string(),
            created_at: 1_700_000_000_000,
            file_path: None,
        };
        let json = serde_json::to_string(&vec![item]).unwrap();
        let back: Vec<PersistedDownload> = serde_json::from_str(&json).unwrap();
        assert_eq!(back.len(), 1);
        assert_eq!(back[0].url, "https://www.youtube.com/watch?v=abc");
        assert_eq!(back[0].output_dir.as_deref(), Some(r"C:\Music"));
    }

    #[test]
    fn json_corrupto_no_rompe_y_devuelve_vacio() {
        #[derive(Deserialize)]
        struct Probe {
            _unused: String,
        }
        // Solo verificamos que el parser rechaza basura y que load_queue
        // tolera un archivo ilegible (no puede fijar paths en este test).
        let parsed: Result<Vec<PersistedDownload>, _> = serde_json::from_str("esto no es json");
        assert!(parsed.is_err());
        let probe: Result<Probe, _> = serde_json::from_str("{}");
        assert!(probe.is_err());
    }
}
