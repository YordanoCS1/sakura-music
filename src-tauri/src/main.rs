// Evita que Windows abra una ventana de consola extra en las compilaciones de
// publicación; no eliminar.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    sakura_desktop_lib::run()
}
