# 0018. Actualizaciones firmadas e instaladores

- **Estado:** Aceptada (2026-11-19)

## Contexto

Los releases se distribuían como bundles sin canal de actualización. El CI ya
generaba artefactos con firma opcional, pero la app no tenía forma de consultar
versiones nuevas.

## Decisión

Se activan los plugins `updater` y `process` de Tauri 2, con bundle NSIS/MSI y
un endpoint de GitHub Releases en `plugins.updater` de `tauri.conf.json`. El
par de claves minisign se generó con el CLI de Tauri: la pública está en el
repo y la privada es un secreto de CI. Ajustes → Sistema permite buscar,
descargar, instalar y reiniciar.

## Alternativas

- **Descargar el `.exe` a mano desde GitHub:** sin verificación criptográfica
  ni control de versión.
- **Actualizador propio con HTTP:** duplicaría lo que el plugin ya hace y
  requeriría manejar firmas a mano.

## Consecuencias

- Antes del primer release hay que reemplazar `REPLACE_OWNER/REPLACE_REPO` y
  publicar el `latest.json` que genera `tauri build`.
- Si no están los secrets, el build sigue pero los bundles quedan sin firmar.
- El plugin trajo `ring`, que con MSVC y rutas largas fallaba con `D8050`; por
  eso `[profile.dev] debug = 0` en `Cargo.toml`.

## Reflejo en el código

`tauri.conf.json`, `capabilities/default.json`, `Cargo.toml`, `lib.rs`,
`src/components/SystemPanel.tsx`, `docs/release.md`.
