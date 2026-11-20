# Procedimiento de release

Esta guía deja registrado cómo sacar una versión de Sakura Music. La app tiene **actualizaciones automáticas firmadas** con el plugin `updater` de Tauri; cada release debe publicar también el manifiesto `latest.json`.

## 1. Preparar la versión

1. Elegí un número `X.Y.Z` siguiendo [Semantic Versioning](https://semver.org/lang/es/).
2. Actualizalo en los tres sitios (deben coincidir):
   - `package.json` → `version`
   - `src-tauri/Cargo.toml` → `version`
   - `src-tauri/tauri.conf.json` → `version`
3. Mové los cambios de `[Sin publicar]` a una sección `## [X.Y.Z] - AAAA-MM-DD` en [`CHANGELOG.md`](../CHANGELOG.md).
4. Corregí la tabla "Última revisión" de [`docs/README.md`](README.md) si cambió el comportamiento.

## 2. Verificaciones obligatorias

```powershell
npm ci
npm run check                                   # tipos, lint, formato, tests unitarios y build
npm run test:e2e                                # smoke test sobre Vite con IPC simulado
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
npm run audit                                   # informativo: ver aviso de picomatch
```

El CI de GitHub ejecuta lo mismo en Windows, macOS y Linux. No publiques si alguna comprobación falla.

## 3. Compilar los instaladores

En local:

```powershell
npm run tauri build
```

Los bundles quedan en `src-tauri/target/release/bundle/` (`.msi`/`.exe` en Windows, `.dmg`/`.app` en macOS, `.deb`/`.AppImage` en Linux).

En CI, el job `build` se dispara con `workflow_dispatch` o al pushear un tag `vX.Y.Z`, compila en `windows-latest` y sube el bundle como artefacto.

## 4. Firma

Hay dos firmas distintas y no conviene confundirlas:

| Qué | Para qué | Cómo |
|---|---|---|
| **Bundle del actualizador** (Tauri) | Verificar futuros paquetes de actualización | La clave pública está en `src-tauri/updater.key.pub` y en `tauri.conf.json`; la privada es `src-tauri/updater.key` (ignorada por git, password `sakura-updater-2026`). Definí los secretos `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` para que `tauri build` genere los `.sig`. |
| **Authenticode de Windows** | Evitar el aviso "editor desconocido" de Windows Defender/SmartScreen | Requiere un certificado de código. Importarlo en el almacén del runner y ejecutar `signtool sign /fd SHA256 /tr <timestamp-url> /td SHA256` sobre el `.exe`/`.msi` antes de subirlo. |

Si no hay certificado de código, **no finjas que está firmado**: documentalo en las notas de release para que el usuario sepa que Windows puede mostrar una advertencia la primera vez.

> **Importante:** el endpoint del updater en `tauri.conf.json` apunta a
> `sakura-music/sakura-music`. Si publicás en otro repo, cambialo antes de
> compilar el instalador: debe coincidir con el repo real o la app nunca va a
> encontrar `latest.json`.

## 5. Publicar

1. Hacé el commit de preparación y verificá que el CI esté en verde.
2. Etiquetá: `git tag -a vX.Y.Z -m "Sakura Music X.Y.Z"` y `git push origin vX.Y.Z`.
3. Creá la release en GitHub con el changelog de esa versión y adjuntá los bundles **y el `latest.json`** que genera `tauri build` (el updater lo busca en el endpoint configurado).
4. Reemplazá `REPLACE_OWNER/REPLACE_REPO` en `src-tauri/tauri.conf.json` por el owner/repo real antes del primer release.
4. Anotá en el issue/PR de release qué quedó sin firmar y qué plataformas se probaron de verdad.

## Checklist rápido

- [ ] Versión coincidente en los 3 archivos.
- [ ] `CHANGELOG.md` con fecha real.
- [ ] `npm run check` y `npm run test:e2e` en verde.
- [ ] `cargo fmt --check`, `clippy -D warnings` y 43 tests Rust en verde.
- [ ] Bundles generados y `latest.json` adjunto; si corresponde, firmados.
- [ ] Tag `vX.Y.Z` y release con artefactos.
