use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::mpsc;
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::Emitter;

struct WatcherState {
    root: PathBuf,
    _watcher: RecommendedWatcher,
}

pub struct LibraryWatcher {
    state: Mutex<Option<WatcherState>>,
}

impl LibraryWatcher {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(None),
        }
    }

    pub fn watch(&self, app: tauri::AppHandle, root: &Path) -> Result<(), String> {
        let mut state = self
            .state
            .lock()
            .map_err(|error| format!("No se pudo acceder al vigilante de biblioteca: {}", error))?;
        if state.as_ref().map(|current| current.root.as_path()) == Some(root) {
            return Ok(());
        }
        *state = None;

        let (sender, receiver) = mpsc::channel();
        let mut watcher = notify::recommended_watcher(
            move |result: notify::Result<notify::Event>| match result {
                Ok(event) if !event.paths.is_empty() => {
                    let _ = sender.send(());
                }
                Ok(_) => {}
                Err(error) => crate::logging::warn(
                    "library_watcher",
                    &format!("Error al vigilar cambios en la biblioteca: {}", error),
                ),
            },
        )
        .map_err(|error| format!("No se pudo crear el vigilante de biblioteca: {}", error))?;
        watcher
            .watch(root, RecursiveMode::Recursive)
            .map_err(|error| format!("No se pudo vigilar {}: {}", root.display(), error))?;

        let event_app = app;
        let event_root = root.to_path_buf();
        std::thread::spawn(move || {
            while receiver.recv().is_ok() {
                loop {
                    // Agrupamos los eventos que llegan seguidos (copiar un álbum
                    // dispara muchos) y avisamos a la UI solo cuando se detienen.
                    match receiver.recv_timeout(Duration::from_millis(700)) {
                        Ok(()) => continue,
                        Err(mpsc::RecvTimeoutError::Timeout) => {
                            if let Err(error) =
                                event_app.emit("library-changed", event_root.to_string_lossy())
                            {
                                crate::logging::warn(
                                    "library_watcher",
                                    &format!(
                                        "No se pudo notificar un cambio de biblioteca: {}",
                                        error
                                    ),
                                );
                            }
                            break;
                        }
                        Err(mpsc::RecvTimeoutError::Disconnected) => return,
                    }
                }
            }
        });

        *state = Some(WatcherState {
            root: root.to_path_buf(),
            _watcher: watcher,
        });
        Ok(())
    }
}
