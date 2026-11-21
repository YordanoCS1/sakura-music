# Procedimiento de versión

Esta guía deja registrado cómo numerar y documentar una versión de Sakura Music. La app es local-first y no tiene actualizador automático ni canal de firma: cada versión se distribuye por separado.

## 1. Preparar la versión

1. Seleccione un número `X.Y.Z` siguiendo [Semantic Versioning](https://semver.org/lang/es/).
2. Actualícelo en los tres sitios (deben coincidir):
   - `package.json` → `version`
   - `src-tauri/Cargo.toml` → `version`
   - `src-tauri/tauri.conf.json` → `version`
3. Mueva los cambios de `[Sin publicar]` a una sección `## [X.Y.Z] - AAAA-MM-DD` en [`CHANGELOG.md`](../CHANGELOG.md).
4. Corrija la tabla “Última revisión” de [`docs/README.md`](README.md) si cambió el comportamiento.

## 2. Verificaciones obligatorias

```powershell
npm ci
npm run check                                   # tipos, lint, formato, tests unitarios y build
npm run test:e2e                                # smokes sobre Vite con IPC simulado
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
npm run audit                                   # informativo
```

El CI de GitHub ejecuta lo mismo en Windows, macOS y Linux. No publice si alguna comprobación falla.

## 3. Distribución

El repo no genera instaladores (`bundle.active` es `false` en `tauri.conf.json`). Para probar la app en local:

```powershell
npm run tauri dev
```

Si en el futuro se decide retomar la distribución empaquetada, hay que volver a habilitar `bundle.active` y definir `bundle.targets`, además de decidir el canal de actualizaciones y su firma.

## Checklist rápido

- [ ] Versión coincidente en los 3 archivos.
- [ ] `CHANGELOG.md` con fecha real.
- [ ] `npm run check` y `npm run test:e2e` en verde.
- [ ] `cargo fmt --check`, `clippy -D warnings` y los tests Rust en verde.
- [ ] Tabla de documentación actualizada.
