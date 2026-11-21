# Launcher y primera release

Estado: **listo para empaquetar**. El instalador NSIS se construyó y firmó
localmente con los comandos de abajo.

## Instalador personalizado

El NSIS no es el template genérico: tiene **cabecera y barra lateral propias**
(colores de Estudio), selector de idioma (español/inglés), carpeta de menú Inicio
`Sakura Music`, registro en Agregar/Quitar programas, acceso directo al escritorio
en la página final y hooks propios (`src-tauri/windows/hooks.nsh`) que escriben un
`LEEME.txt` con la ruta de datos y limpian al desinstalar.

El asistente incluye la página **Elegir ubicación de instalación**: el usuario
decide la carpeta, por defecto `%LOCALAPPDATA%\Sakura Music` (no pide permisos de
administrador). El modo de instalación es `currentUser`; si querés que ofrezca
también "para todos los usuarios", cambiá `installMode` a `both` en
`tauri.conf.json` (el instalador pedirá elevación).

## No compilar con cargo directo

El instalador **siempre** se genera con `npm run tauri build`. Si compilás el
binario con `cargo build --release` y después usás `tauri bundle`, el exe no
lleva el feature `custom-protocol`: la app intenta cargar el frontend desde
`http://localhost:1420` (el servidor de desarrollo), abre Edge y muestra
`ERR_CONNECTION_REFUSED`. El build de Tauri es el que habilita ese feature y
embede los archivos de `dist/`.

## Artefactos

En `src-tauri/target/release/bundle/nsis/`:

| Archivo | Para qué |
|---|---|
| `Sakura Music_2.0.0_x64-setup.exe` | Instalador NSIS (el "launcher") |
| `Sakura Music_2.0.0_x64-setup.exe.sig` | Firma minisign del instalador |
| `latest.json` | Manifiesto que consume el actualizador |

`latest.json` apunta a
`https://github.com/YordanoCS1/sakura-music/releases/latest/download/...`.
**Cambialo en `tauri.conf.json` y en el manifiesto si el repo es otro.**

## Construir

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = (Resolve-Path src-tauri/updater.key).Path
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = 'sakura-updater-2026'
npm run tauri build -- --bundles nsis
```

Si `tauri build` no dejó el `.sig`, firmalo a mano:

```powershell
npm run tauri signer sign -- -f src-tauri/updater.key -p sakura-updater-2026 --app-version 2.0.0 `
  "src-tauri/target/release/bundle/nsis/Sakura Music_2.0.0_x64-setup.exe"
```

## Datos de la app

La base, las carátulas y los respaldos viven en **`APPLOCALDATA` de Tauri**
(`%LOCALAPPDATA%\com.sakura.music` en Windows), no en el directorio de trabajo.
Eso permite que la app instalada escriba aunque esté en `Program Files`. Si
existe un `.tauri_data/` viejo del desarrollo, se copia automáticamente la
primera vez.

El CLI `sakura-cli` sigue usando `.tauri_data` del directorio actual por defecto;
para apuntar a la base de la app instalada pasá `--data <ruta APPLOCALDATA>`.

## MSI (opcional)

`tauri.conf.json` declara `nsis` y `msi`. El CI construye sólo NSIS para no
depender de WiX. Para generar el MSI en local:

```powershell
npm run tauri build -- --bundles msi
```

## Publicar

1. Tag `v2.0.0` y release en GitHub con el `.exe`, el `.sig` y `latest.json`.
2. Secrets del repo: `TAURI_SIGNING_PRIVATE_KEY` y
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
3. Si no hay Authenticode, aclarar en las notas que Windows puede mostrar una
   advertencia la primera vez.
4. Probar **Instalar → abrir → escanear una carpeta → cerrar → reabrir**: la
   biblioteca debe seguir ahí.


## Verificación realizada

- `npm run tauri build -- --bundles nsis`: instalador generado.
- `npm run tauri signer sign`: firma minisign generada y volcada en `latest.json`.
- Configuración NSIS validada por `tauri-build` (idiomas, imágenes, hooks y modo).
- Ruta de datos resuelta por Tauri: `APPLOCALDATA`, confirmada en el log de arranque.

La instalación interactiva y la persistencia después de reiniciar se validan
en el equipo donde se publique: este entorno de desarrollo bloquea escrituras de
los binarios fuera del workspace, así que el smoke test de "instalar y reabrir"
no se pudo completar acá.
