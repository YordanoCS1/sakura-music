# Cómo contribuir

Gracias por querer mejorar Sakura Music. Este documento es la guía corta para arrancar y para que tu cambio entre sin sorpresas.

## 1. Poner en marcha el proyecto

Necesitás **Node.js 20+**, **Rust estable** y, para buscar o descargar música, **yt-dlp y FFmpeg** en el `PATH` o en la carpeta `bin/` de los datos de la app.

```powershell
npm install
npm run tauri dev
```

El detector `iniciar_sakura.bat` hace lo mismo en Windows. Los datos se guardan en `.tauri_data/` dentro de la carpeta del proyecto (base de datos, cola, carátulas y binarios).

Antes de tocar código, leé [arquitectura.md](docs/arquitectura.md) y [desarrollo.md](docs/desarrollo.md). La regla del repo es simple: **si un dato no está en el README ni en `docs/`, no existe en la app**.

## 2. Convenciones

- **Idioma:** documentación y comentarios en **español rioplatense**. Los identificadores de código van en inglés, como es habitual (`downloadQueue`, `isPlaying`). Los comentarios explican el *por qué*, no repiten la sentencia.
- **Sin secretos:** nunca rutas hardcodeadas de un usuario ni tokens. Las herramientas se buscan en orden (datos de la app, instalación anterior, winget, `PATH`).
- **Escrituras atómicas:** todo tag, carátula o archivo de estado se escribe con temporal + `rename` y reintentos. No agregues escrituras directas sobre archivos del usuario.
- **Comandos nuevos:** si agregás un `#[tauri::command]`, registralo en el `invoke_handler` de `lib.rs`, documentalo en [ipc-contract.md](docs/ipc-contract.md) y agregá su tipo al contrato si devuelve datos.
- **Decisiones:** los cambios de arquitectura o los revert de decisiones anteriores van acompañados de un ADR en `docs/adr/` (ver [índice](docs/adr/README.md)). Si una decisión antigua dejó de regir, marcá el ADR como superado en vez de borrarlo.

## 3. Cambios y commits

- Trabajá en una rama corta con nombre descriptivo (`feature/catalogo-musicbrainz`, `fix/cola-persistida`).
- Commits en **imperativo** y con prefijo: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`. Ejemplo: `fix: reintentar la escritura cuando Windows bloquea el archivo`.
- Un commit = una idea. Si limpiás código muerto y además cambiás documentación, hacé dos commits.

## 4. Verificaciones antes de abrir un PR

Ejecutá todo esto en local:

```powershell
npm run pipeline        # todo lo que corre el CI, en orden
```

O, si querés correr las etapas por separado:

```powershell
npm run check                                   # tipos + lint + formato + 58 unitarios + build
npm run test:e2e                                # navegador + arranque de la UI (30 E2E)
cargo test --manifest-path src-tauri/Cargo.toml  # 43 tests Rust
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

El mapa visual está en [docs/pipeline.md](docs/pipeline.md) y las funciones
recientes en [docs/nuevas-funciones.md](docs/nuevas-funciones.md).

Eso mismo corre el CI en Windows, macOS y Linux. Si agregás lógica al
frontend, sumá un test con Vitest en `src/**/*.test.ts`. Para medir el escaneo,
usá `node scripts/benchmark_scan.mjs [cantidad]` (el CLI `scan` imprime los
milisegundos; en esta máquina, 10.000 pistas tardaron ~12,6 s en release).

Si tu cambio toca la UI, revisá también el comportamiento con `npm run tauri dev`: búsqueda, reproducción (incluido renombrar una pista mientras suena) y persistencia de la cola al reabrir.

## 5. Reportar problemas

Usá los issues con el modulo afectado (`biblioteca`, `descargas`, `metadatos`, `UI`) y el pasito para reproducir. Si es una vulnerabilidad, **no la publiques en un issue**: seguí [SECURITY.md](SECURITY.md).
