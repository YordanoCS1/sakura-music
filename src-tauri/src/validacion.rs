//! Validación de lo que viene del renderer.
//!
//! Tauri confía en el frontend: cualquier webview comprometida podría mandar
//! strings de millones de caracteres, rutas arbitrarias o números absurdos.
//! Estos límites se aplican en la frontera IPC, antes de que el valor llegue
//! al filesystem, a SQLite o a un proceso externo.

pub const MAX_CONSULTA: usize = 200;
pub const MAX_TEXTO: usize = 300;
pub const MAX_RUTA: usize = 4096;
pub const MAX_IMAGEN_BYTES: usize = 12 * 1024 * 1024;
pub const MAX_LOTE: usize = 5_000;
pub const MAX_LIMITE: usize = 1_000;
pub const MAX_LOGS: usize = 500;
pub const MAX_ANIO: u32 = 9_999;
pub const MAX_PISTA: u32 = 9_999;

/// Un texto recortado a `max` caracteres. Los caracteres de control se
/// rechazan: no aportan nada a un título y sí pueden romper un log o un CSV.
pub fn texto(valor: &str, max: usize, campo: &str) -> Result<(), String> {
    let largo = valor.chars().count();
    if largo > max {
        return Err(format!(
            "{campo} es demasiado largo ({largo} caracteres, máximo {max})"
        ));
    }
    if valor.chars().any(|c| c.is_control()) {
        return Err(format!("{campo} contiene caracteres de control"));
    }
    Ok(())
}

pub fn texto_opcional(valor: &Option<String>, max: usize, campo: &str) -> Result<(), String> {
    match valor {
        Some(valor) => texto(valor, max, campo),
        None => Ok(()),
    }
}

/// Una ruta nunca supera `MAX_RUTA` ni contiene un NUL (que truncaría la
/// cadena en las APIs del sistema operativo).
pub fn ruta(valor: &str, campo: &str) -> Result<(), String> {
    texto(valor, MAX_RUTA, campo)?;
    if valor.contains('\0') {
        return Err(format!("{campo} contiene un carácter NUL"));
    }
    Ok(())
}

pub fn cantidad(valor: usize, max: usize, campo: &str) -> Result<(), String> {
    if valor > max {
        return Err(format!("{campo} supera el máximo permitido ({max})"));
    }
    Ok(())
}

pub fn numero(valor: Option<u32>, max: u32, campo: &str) -> Result<(), String> {
    match valor {
        Some(valor) if valor > max => Err(format!("{campo} está fuera de rango")),
        _ => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn texto_rechaza_demasiado_largo_y_caracteres_de_control() {
        assert!(texto(&"a".repeat(MAX_TEXTO), MAX_TEXTO, "Título").is_ok());
        assert!(texto(&"a".repeat(MAX_TEXTO + 1), MAX_TEXTO, "Título").is_err());
        assert!(texto("hola\nmundo", MAX_TEXTO, "Título").is_err());
    }

    #[test]
    fn ruta_rechaza_nulos() {
        assert!(ruta("C:\\Música\\a.flac", "Ruta").is_ok());
        assert!(ruta("C:\\M\0usica", "Ruta").is_err());
    }

    #[test]
    fn limites_de_cantidad_y_numero() {
        assert!(cantidad(5, 10, "Límite").is_ok());
        assert!(cantidad(11, 10, "Límite").is_err());
        assert!(numero(Some(2026), MAX_ANIO, "Año").is_ok());
        assert!(numero(Some(100_000), MAX_ANIO, "Año").is_err());
        assert!(numero(None, MAX_ANIO, "Año").is_ok());
    }
}
