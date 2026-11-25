//! sakura-cli: interfaz de línea de comandos para el engine de Sakura Music.
//! Comparte los mismos módulos que la app, así que sirve para scripts y para
//! probar la base de datos sin levantar la interfaz.

use sakura_desktop_lib::{library_db, paths, scanner};
use std::path::{Path, PathBuf};

fn main() {
    if let Err(error) = ejecutar() {
        eprintln!("Error: {error}");
        std::process::exit(1);
    }
}

fn directorio_datos() -> PathBuf {
    let actual = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if actual.join("src-tauri").is_dir() {
        actual.join("src-tauri").join(".tauri_data")
    } else {
        actual.join(".tauri_data")
    }
}

fn ejecutar() -> Result<(), String> {
    let mut argumentos: Vec<String> = std::env::args().skip(1).collect();

    let mut datos: Option<PathBuf> = None;
    if let Some(pos) = argumentos.iter().position(|a| a == "--data") {
        datos = Some(
            argumentos
                .get(pos + 1)
                .map(PathBuf::from)
                .ok_or_else(|| "Falta el directorio después de --data".to_string())?,
        );
        argumentos.drain(pos..=pos + 1);
    }
    paths::init(datos.unwrap_or_else(directorio_datos));
    library_db::initialize()?;

    match argumentos.first().map(String::as_str) {
        Some("scan") => comando_scan(&argumentos[1..]),
        Some("search") => comando_search(&argumentos[1..]),
        Some("export") => comando_export(&argumentos[1..]),
        Some("import") => comando_import(&argumentos[1..]),
        Some("doctor") => {
            println!("{}", library_db::doctor()?);
            Ok(())
        }
        Some("theme") => comando_theme(&argumentos[1..]),
        Some("help") | None => {
            ayuda();
            Ok(())
        }
        Some(otro) => Err(format!(
            "Comando desconocido: {otro}. Usá `sakura-cli help`."
        )),
    }
}

fn comando_scan(args: &[String]) -> Result<(), String> {
    let carpeta = args
        .first()
        .ok_or_else(|| "Uso: scan <carpeta>".to_string())?;
    let ruta = Path::new(carpeta);
    if !ruta.is_dir() {
        return Err(format!("No es una carpeta: {carpeta}"));
    }

    let inicio = std::time::Instant::now();
    let archivos = scanner::list_audio_files(ruta);
    let entradas: Vec<library_db::ScanEntry> = archivos
        .iter()
        .filter_map(|archivo| scanner::scan_audio_file(archivo))
        .map(|track| library_db::ScanEntry {
            modified_ns: std::fs::metadata(&track.path)
                .and_then(|m| m.modified())
                .ok()
                .and_then(|m| m.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_nanos().min(i64::MAX as u128) as i64)
                .unwrap_or(0),
            track,
        })
        .collect();

    let total = entradas.len();
    library_db::sync_scan(ruta, &entradas)?;
    println!(
        "Escaneadas {total} pistas en {carpeta} · {} ms",
        inicio.elapsed().as_millis()
    );
    Ok(())
}

fn comando_search(args: &[String]) -> Result<(), String> {
    if args.is_empty() {
        return Err("Uso: search <consulta> [--limit N]".to_string());
    }
    let mut limite = 50usize;
    let mut consulta = Vec::new();
    let mut i = 0;
    while i < args.len() {
        if args[i] == "--limit" {
            limite = args
                .get(i + 1)
                .and_then(|v| v.parse().ok())
                .ok_or_else(|| "Valor inválido para --limit".to_string())?;
            i += 2;
        } else {
            consulta.push(args[i].clone());
            i += 1;
        }
    }
    let resultados = library_db::search_tracks(&consulta.join(" "), limite)?;
    for pista in resultados {
        println!(
            "{}\t{}\t{}\t{}",
            pista.id, pista.title, pista.artist, pista.album
        );
    }
    Ok(())
}

fn comando_export(args: &[String]) -> Result<(), String> {
    let pistas: Vec<_> = library_db::cached_tracks()?
        .into_iter()
        .map(|entrada| entrada.track)
        .collect();
    let json = serde_json::to_string_pretty(&pistas)
        .map_err(|error| format!("No se pudo serializar la biblioteca: {error}"))?;
    if let Some(pos) = args.iter().position(|a| a == "-o" || a == "--out") {
        let destino = args
            .get(pos + 1)
            .ok_or_else(|| "Falta el archivo de destino".to_string())?;
        std::fs::write(destino, json)
            .map_err(|error| format!("No se pudo escribir {destino}: {error}"))?;
        println!("Exportadas {} pistas a {destino}", pistas.len());
    } else {
        println!("{json}");
    }
    Ok(())
}

fn comando_import(args: &[String]) -> Result<(), String> {
    let archivo = args
        .first()
        .ok_or_else(|| "Uso: import <biblioteca.json>".to_string())?;
    let datos = std::fs::read_to_string(archivo)
        .map_err(|error| format!("No se pudo leer {archivo}: {error}"))?;
    let pistas: Vec<scanner::ScannedTrack> = serde_json::from_str(&datos)
        .map_err(|error| format!("El archivo no es una biblioteca válida: {error}"))?;
    let total = library_db::import_tracks(&pistas)?;
    println!("Importadas {total} pistas desde {archivo}");
    Ok(())
}

fn opcion(args: &[String], nombre: &str) -> Option<String> {
    args.iter()
        .position(|a| a == nombre)
        .and_then(|i| args.get(i + 1).cloned())
}

fn rgb(hex: &str) -> (u8, u8, u8) {
    let h = hex.trim_start_matches('#');
    if h.len() != 6 {
        return (128, 128, 128);
    }
    (
        u8::from_str_radix(&h[0..2], 16).unwrap_or(128),
        u8::from_str_radix(&h[2..4], 16).unwrap_or(128),
        u8::from_str_radix(&h[4..6], 16).unwrap_or(128),
    )
}

fn mezclar(hex: &str, objetivo: (u8, u8, u8), peso: f64) -> String {
    let (r, g, b) = rgb(hex);
    let mezcla = |v: u8, dest: u8| (v as f64 * (1.0 - peso) + dest as f64 * peso).round() as u8;
    format!(
        "#{:02x}{:02x}{:02x}",
        mezcla(r, objetivo.0),
        mezcla(g, objetivo.1),
        mezcla(b, objetivo.2)
    )
}

fn comando_theme(args: &[String]) -> Result<(), String> {
    let nombre = opcion(args, "--name").unwrap_or_else(|| "nuevo-tema".to_string());
    let id = nombre
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string();
    let fondo = opcion(args, "--bg").unwrap_or_else(|| "#f4f1fa".to_string());
    let claro = {
        let (r, g, b) = rgb(&fondo);
        (r as u16 + g as u16 + b as u16) / 3 > 128
    };
    let superficie = opcion(args, "--surface").unwrap_or_else(|| {
        if claro {
            "#ffffff".to_string()
        } else {
            mezclar(&fondo, (255, 255, 255), 0.06)
        }
    });
    let texto = opcion(args, "--text")
        .unwrap_or_else(|| if claro { "#241c38" } else { "#f4f0ff" }.to_string());
    let suave = opcion(args, "--muted")
        .unwrap_or_else(|| if claro { "#7d7191" } else { "#9a93ad" }.to_string());
    let acento = opcion(args, "--accent").unwrap_or_else(|| "#8b5cf6".to_string());
    let linea = opcion(args, "--line")
        .unwrap_or_else(|| if claro { "#d9d2e8" } else { "#3a4352" }.to_string());
    let radio = opcion(args, "--radio").unwrap_or_else(|| "14".to_string());
    let fuente = opcion(args, "--font").unwrap_or_else(|| "inherit".to_string());

    let objetivo = if claro { (255, 255, 255) } else { (0, 0, 0) };
    let on_accent = if claro { "#ffffff" } else { "#0b0b12" };
    let (ar, ag, ab) = rgb(&acento);
    let escala = [300u16, 400, 500, 600, 700, 800, 900, 950];
    let vars_acento = escala
        .iter()
        .enumerate()
        .map(|(i, _)| {
            let c = mezclar(&acento, objetivo, (i + 1) as f64 / 10.0);
            let (r, g, b) = rgb(&c);
            format!("  --accent-{}: {r} {g} {b};", escala[i])
        })
        .collect::<Vec<_>>()
        .join("\n");

    let css = format!(
        "/* Tema {id} · generado por sakura-cli */\n\
         .app-shell[data-skin='{id}'] {{\n\
         \x20 --m3-surface:{fondo}; --m3-surface-card:{superficie}; --m3-on-surface:{texto};\n\
         \x20 --m3-on-surface-muted:{suave}; --m3-primary:{acento};\n\
         \x20 --space-text:{texto}; --space-muted:{suave}; --space-border:{linea};\n\
         {vars_acento}\n\
         \x20 --tema-accent:{acento}; --tema-accent-soft:rgba({ar},{ag},{ab},.09);\n\
         \x20 --tema-texto:{texto}; --tema-texto-suave:{suave}; --tema-linea:{linea};\n\
         \x20 background:{fondo} !important; color:{texto} !important;\n\
         \x20 --set-panel-base:{superficie}; --set-radio-base:{radio}px;\n\
         \x20 --set-font-base:{fuente}; --set-on-accent-base:{on_accent};\n\
         }}\n\
         .app-shell[data-skin='{id}'] .glass-card {{ background:{superficie} !important; border-color:{linea} !important; border-radius:{radio}px !important; }}\n\
         .app-shell[data-skin='{id}'] .theme-library-nav button.is-active {{ background:{acento} !important; color:{on_accent} !important; }}\n\
         .app-shell[data-skin='{id}'] .lt-view-select {{ display:none !important; }}\n"
    );

    if let Some(destino) = opcion(args, "--out") {
        std::fs::write(&destino, &css)
            .map_err(|error| format!("No se pudo escribir {destino}: {error}"))?;
        println!("CSS escrito en {destino}");
    } else {
        print!("{css}");
    }
    Ok(())
}

fn ayuda() {
    println!("sakura-cli — engine de Sakura Music sin interfaz\n");
    println!("  scan <carpeta>              Escanea audio y sincroniza la biblioteca");
    println!("  search <texto> [--limit N]  Busca con el índice FTS5");
    println!("  export [-o archivo]         Exporta la biblioteca a JSON");
    println!("  import <archivo.json>       Importa pistas a SQLite");
    println!("  doctor                      Verifica la base y reconstruye el índice FTS");
    println!("  theme --name X --bg #... --accent #... [--out archivo]");
    println!("                              Genera CSS para un tema nuevo");
    println!("  help                        Muestra esta ayuda");
    println!("\nOpciones globales: --data <carpeta> (por defecto, src-tauri/.tauri_data)");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rgb_y_mezclar_calculan_colores_validos() {
        assert_eq!(rgb("#ff8000"), (255, 128, 0));
        assert_eq!(rgb("invalido"), (128, 128, 128));
        assert_eq!(mezclar("#000000", (255, 255, 255), 0.5), "#808080");
    }

    #[test]
    fn opcion_extrae_el_valor_siguiente_al_flag() {
        let args = vec![
            "--name".to_string(),
            "Noche".to_string(),
            "--accent".to_string(),
            "#e11d48".to_string(),
        ];
        assert_eq!(opcion(&args, "--name").as_deref(), Some("Noche"));
        assert_eq!(opcion(&args, "--accent").as_deref(), Some("#e11d48"));
        assert_eq!(opcion(&args, "--bg"), None);
    }

    #[test]
    fn comando_theme_escribe_css_con_tokens_esperados() {
        let dir = std::path::PathBuf::from("target")
            .join(format!("sakura_cli_theme_test_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let out = dir.join("tema.css");
        let args = vec![
            "--name".to_string(),
            "Sakura Test".to_string(),
            "--bg".to_string(),
            "#101014".to_string(),
            "--accent".to_string(),
            "#ec4899".to_string(),
            "--out".to_string(),
            out.to_string_lossy().to_string(),
        ];

        let res = comando_theme(&args);
        assert!(res.is_ok());
        let css = std::fs::read_to_string(&out).expect("el archivo CSS debe existir");
        assert!(css.contains("[data-skin='sakura-test']"));
        assert!(css.contains("--m3-surface:#101014"));
        assert!(css.contains("--m3-primary:#ec4899"));
        assert!(css.contains("--accent-500:"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn comandos_validan_argumentos_faltantes() {
        assert!(comando_scan(&[]).is_err());
        assert!(comando_search(&[]).is_err());
        assert!(comando_import(&[]).is_err());
    }
}
