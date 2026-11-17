# Pipeline de Sakura Music

Representación visual de `.github/workflows/ci.yml`. La fuente de verdad es ese archivo; este documento es el mapa para leerlo de un vistazo.

## Diagrama

```mermaid
flowchart TD
    IN["Push a master · Pull request · Ejecución manual"] --> CHK

    subgraph CHK["Comprobaciones — matriz 3 SO"]
      direction TB
      S1["npm ci"] --> S2["typecheck · tsc --noEmit"]
      S2 --> S3["lint · ESLint"]
      S3 --> S4["formato · Prettier"]
      S4 --> S5["tests unitarios · Vitest (7)"]
      S5 --> S6["tests E2E · Playwright (2)"]
      S6 --> S7["build · vite"]
      S7 --> S8["cargo fmt --check"]
      S8 --> S9["cargo clippy -D warnings"]
      S9 --> S10["cargo test (17)"]
      S10 --> S11["npm audit · informativo"]
    end

    CHK --> GATE{"¿Tag v* o ejecución manual?"}
    GATE -->|"no"| FIN["Listo"]
    GATE -->|"sí"| BUILD["Job build · windows-latest"]

    subgraph BUILD["Generación del instalador"]
      direction TB
      B1["npm ci + tauri build"] --> B2["Firma opcional con secretos"] --> B3["Upload del bundle"]
    end

    BUILD --> FIN2["Artefacto descargable"]
```

## Etapas

| # | Etapa | Comando | Bloquea | Qué valida |
|---|---|---|---|---|
| 1 | Instalar | `npm ci` | sí | Lockfile reproducible |
| 2 | Tipos | `npm run typecheck` | sí | `strict` + `noUnusedLocals` del frontend |
| 3 | Lint | `npm run lint` | sí | React Hooks y reglas de TypeScript |
| 4 | Formato | `npm run format:check` | sí | Prettier en TS/TSX/JS/JSON/YAML |
| 5 | Unitarios | `npm test` | sí | Cola persistida y `ErrorBoundary` |
| 6 | E2E | `npm run test:e2e` | sí | Arranque, splash, pestañas y teclado |
| 7 | Build | `npm run build` | sí | `tsc` + bundle de producción |
| 8 | Formato Rust | `cargo fmt --check` | sí | `rustfmt.toml` |
| 9 | Lint Rust | `cargo clippy -D warnings` | sí | 0 avisos |
| 10 | Tests Rust | `cargo test` | sí | 17 pruebas |
| 11 | Auditoría | `npm run audit` | **no** | `picomatch`: aviso *high* sin corrección |
| 12 | Instalador | `npm run tauri build` | sí | Sólo con tag o manual |

Las etapas 1–11 corren en **Windows, macOS y Linux**. La 12 sólo en Windows.

## Cómo verlo

- **En local, de un vistazo:** este documento.
- **En local, ejecutándolo:** `npm run pipeline` (corre todas las etapas bloqueantes en orden).
- **En GitHub:** subí el repo y entrá a *Actions → CI*. El job del instalador se lanza con *Run workflow* o con un tag `vX.Y.Z`.

## Convenciones

- Si agregás una etapa, sumala al workflow, a la tabla y al diagrama en el mismo commit.
- Un paso `continue-on-error: true` debe explicarse en la columna "Bloquea" y en el propio YAML.
- Los secretos de firma se documentan en [release.md](release.md); nunca van en el repositorio.
