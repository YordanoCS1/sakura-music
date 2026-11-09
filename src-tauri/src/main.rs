// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    unsafe {
        std::env::set_var("RUST_BACKTRACE", "1");
    }

    // Configurar la variable oficial de Microsoft WebView2 para usar una carpeta
    // garantizada con permisos de usuario en %LOCALAPPDATA% y evitar errores
    // de acceso denegado en la carpeta de build del proyecto.
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        let wv_dir = std::path::PathBuf::from(local).join("SakuraMusic").join("webview");
        let _ = std::fs::create_dir_all(&wv_dir);
        unsafe {
            std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", &wv_dir);
        }
    }

    sakura_desktop_lib::run()
}
