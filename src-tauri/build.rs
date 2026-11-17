use std::process::Command;

fn main() {
    // La tarjeta de estado muestra la versión real del compilador, no un
    // literal que quedaría desactualizado al cambiar la versión del compilador.
    let rustc = std::env::var("RUSTC").unwrap_or_else(|_| "rustc".to_string());
    if let Ok(output) = Command::new(rustc).arg("--version").output()
        && output.status.success()
    {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        println!("cargo:rustc-env=RUSTC_VERSION={}", version);
    }

    tauri_build::build()
}
