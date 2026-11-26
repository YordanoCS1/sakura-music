# Por qué Sakura Music es así

Este documento responde a las preguntas que surgen al leer el código:
**¿por qué este lenguaje?, ¿por qué se hizo de esta forma y no de otra?**
No reemplaza a los [ADRs](adr/README.md): los ADRs registran cada decisión
importante de forma formal y atómica; acá se cuenta el hilo conductor en
lenguaje directo y se enlaza el ADR correspondiente cuando existe.

Cuando una decisión nueva cambia el rumbo, se agrega un ADR nuevo en vez de
reescribir los viejos. Las cifras históricas de los ADRs se conservan; la cifra
vigente de temas es **19**.

---

## 1. Lenguaje y stack: Rust en el motor, React en la interfaz

**Decisión.** Tauri 2 + Rust en el backend y React 19 + TypeScript + Tailwind
en el frontend (ver [ADR 0009](adr/0009-migracion-tauri-2-rust.md)).

**Por qué.** La versión 1.0 estaba en Python/PySide6. El GIL de Python limitaba
el escaneo paralelo de bibliotecas grandes y la distribución de virtualenvs era
pesada. Rust permite indexar con `rayon`/`walkdir` en todos los núcleos, leer y
editar tags con `lofty` sin bloquear archivos en Windows, y entregar un binario
que arranca rápido. React permite que cada tema redibuje estructuras completas
sin pelear con QSS.

**Alternativas descartadas.** Seguir con PySide6 (mismo cuello de botella) y
Electron (bundle mucho más grande para el mismo resultado).

**Consecuencia.** El desarrollo requiere compilador de Rust, pero el usuario
final no instala Python ni dependencias del lenguaje.

---

## 2. Local-first: sin login, sin backend, sin streaming

**Decisión.** La app funciona 100 % en la máquina del usuario: no hay cuentas,
no hay servidor propio, no hay base de datos remota y no reproduce música en
streaming. YouTube es sólo una fuente desde la que se descarga con `yt-dlp`;
los catálogos (iTunes, Deezer, MusicBrainz) se consultan sólo para metadatos.

**Por qué.** La promesa del proyecto es que la biblioteca es del usuario y
sigue funcionando sin conexión. Meter login o streaming convertiría la app en
un servicio y abandonaría esa promesa. El audio se reproduce desde Blob URLs
locales, así se pueden editar tags o carátulas mientras suena.

**Alternativas descartadas.** Un servidor con sincronización y un reproductor
que hiciera streaming directo: ambos rompen el funcionamiento offline y obligan
a gestionar identidad y sesiones.

**Consecuencia.** No hay registro, no hay contraseñas y no hay datos del usuario
fuera de su disco. La privacidad es una propiedad del diseño, no una opción.

---

## 3. Persistencia: SQLite con FTS5, no Postgres ni MySQL

**Decisión.** La biblioteca vive en `library.sqlite3`, con índice FTS5 para
búsquedas, `user_version=2` para migraciones y respaldos (ver
[ADR 0016](adr/0016-migraciones-y-hardening-bd.md)).

**Por qué.** Es una app de un solo usuario y un solo equipo. SQLite es embebido,
no necesita proceso de servidor, ocupa un archivo y se puede copiar entero para
la biblioteca portátil o validar con `integrity_check` antes de importar. FTS5
da búsqueda por texto completo sin depender de un motor externo.

**Alternativas descartadas.** Postgres/MySQL: exigirían instalar y mantener un
servidor para una sola persona. Un JSON plano: no da consultas FTS ni
transacciones atómicas.

**Consecuencia.** Exportar/importar la biblioteca es copiar un archivo, y el
formato se puede verificar antes de reemplazar la base.

---

## 4. Temas: `data-theme` fijo y `data-skin` variable

**Decisión.** El atributo `data-theme` del HTML queda fijo en `space` por
compatibilidad con selectores históricos; el tema elegido se aplica con
`data-skin={tema}` y la clase `tema-{tema}` (ver
[ADR 0012](adr/0012-temas-multiples.md) y
[ADR 0019](adr/0019-temas-propios-estructurales.md)).

**Por qué.** Cambiar `data-theme` rompía `.app-shell` en intentos anteriores.
Mantenerlo fijo preservó los selectores existentes y permitió que los 19 temas
convivieran sin reescribir el esqueleto de la aplicación.

**Alternativas descartadas.** Ampliar los selectores `[data-theme='space']`:
frágil y con regresiones. Un único componente con muchas variantes: se volvía
inmantenible con identidades visuales distintas.

**Consecuencia.** Cada tema puede redefinir tokens y, además, reemplazar Home,
biblioteca y navegación. Los 14 originales más `sakura`, `loto`, `ukiyo`,
`vinilo` y `karesansui` tienen vistas propias; `LibraryTab`/`ZenTopNav` quedan
sólo como fallback para temas importados.

---

## 5. Bibliotecas con estructura propia, no un cambio de color

**Decisión.** Cada tema nuevo dibuja su biblioteca con una arquitectura distinta,
no con la misma grilla de tarjetas en otro color:

| Tema | Estructura | Motivo de la forma |
|---|---|---|
| `sakura` | Jardín hanami: foto real del cerezo, medallón de cinco pétalos, rama y flores en zigzag | El pétalo y la rama son la motif del tema; una tarjeta cuadrada no transmitía "cerezo en flor" |
| `loto` | Tríptico de rollos de seda con aletas laterales, varillas doradas y sellos | El rollo y el oro son propios de la estética imperial |
| `ukiyo` | Rollo lateral de estampas apaisadas con ola SVG y sello rojo | La estampa japonesa se lee en horizontal, como un pergamino que se desliza |
| `vinilo` | Estantería de fundas con discos que asoman, inclinación 3D y plato activo | La analogía física (funda + disco + plato) es la identidad del tema |
| `karesansui` | Arena rastrillada con piedras de paso de bordes orgánicos | Un jardín zen se organiza alrededor de piedras, no de tarjetas |

**Por qué.** Rediseñar sólo la paleta producía vistas indistinguibles entre sí.
El objetivo era que, al cambiar de tema, **cambie la estructura**: el tipo de
superficie, la disposición, la forma de la portada y la interacción.

**Alternativas descartadas.** Mantener la grilla y cambiar `--accent-*`: era
rápido pero los cuatro temas seguían pareciéndose entre sí.

**Consecuencia.** Cada biblioteca vive en su bloque de `ThemeLibrary.tsx` y su
CSS en módulos bajo `src/themes/styles/`. Verificar el resultado exige capturas
reales: los snapshots automáticos cubren ocho temas históricos, no los nuevos.

---

## 6. Control remoto: puente HTTP con PIN, no WebSocket

**Decisión.** El celular habla con la PC mediante un servidor HTTP local
protegido por PIN y QR. La capa `src/lib/puente.ts` abstrae el transporte: usa
el bridge de Tauri en escritorio y `fetch` a `/api/...` en el navegador del
teléfono (ver [ADR 0017](adr/0017-validacion-ipc-y-scope.md) para la validación
de la frontera IPC).

**Por qué.** El celular no es una app nativa ni un segundo cliente en tiempo
real: es un control que envía acciones de reproducción a la PC, que es quien
tiene los archivos y ejecuta el audio. HTTP es suficiente, funciona en cualquier
navegador móvil y el PIN evita que otro dispositivo de la red maneje la
biblioteca. El evento `listen` queda como no-op en el celular; el estado se
re-sincroniza al pollear.

**Alternativas descartadas.** WebSocket o SSE: añaden un canal persistente que
el control remoto no necesita y complican la reconexión y el scope de red.

**Consecuencia.** El mismo componente frontend corre en la PC y en el teléfono
sin saber dónde está; las operaciones de archivo (selector nativo) se degradan
a "no disponible" en el celular.

---

## 7. Notificaciones: nativas con respaldo web

**Decisión.** Al terminar una descarga se envía una notificación del sistema con
título, carátula y acción **Ver biblioteca**, mediante
`@tauri-apps/plugin-notification`. Si no hay permiso o la plataforma no admite
acciones, se mantiene el toast web (ver `src/lib/notificaciones_nativas.ts`).

**Por qué.** Una descarga puede terminar con la app en segundo plano; un toast
dentro de la ventana no se vería. La notificación nativa avisa incluso fuera de
la app y lleva directamente a la biblioteca.

**Alternativas descartadas.** Sólo toast web: depende de que la ventana esté
visible.

**Consecuencia.** Se pide permiso al arrancar y se registran los tipos de
acción antes de enviar; el fallback garantiza que el aviso nunca se pierda.

---

## 8. Recursos locales: la foto del cerezo no se descarga

**Decisión.** El tema Sakura usa `public/images/sakura-tree.jpg`, una foto CC0
guardada en el repo, en lugar del SVG del árbol o de una imagen remota.

**Por qué.** La app es local-first: si la biblioteca funciona sin conexión, su
apariencia también debe hacerlo. Una imagen remota introduciría una dependencia
de red y un riesgo de que el fondo desaparezca. La foto real, además, hace que
el jardín hanami se reconozca como tal de un vistazo.

**Alternativas descartadas.** SVG estilizado: se veía como un dibujo, no como un
cerezo. URL externa: rompe el funcionamiento offline.

**Consecuencia.** El asset se sirve desde la propia app y su atribución queda
registrada en `docs/manual/apariencia.md`.

---

## 9. Sin instalador, actualizador ni firma

**Decisión.** El proyecto no publica artefactos de instalación, actualización
automática ni firmado de bundles. El CI compila y ejecuta tests en tres
plataformas, pero no genera binarios de release.

**Por qué.** Son piezas que requieren secretos de firma y un pipeline de publicación
que el proyecto no quiere mantener. Quitarlas reduce la superficie de
mantenimiento y evita dejar configuración muerta en el CI.

**Consecuencia.** La documentación de release describe el versionado y el build,
pero no un flujo de distribución automática. No se reintroducen sin una
decisión explícita.

---

## 10. Organización del código y calidad

**Decisión.** CSS modular en `src/styles/` y `src/themes/styles/` (importado
desde `App.css`), modales y paneles con carga diferida (`lazy`), hooks separados
(`useThemeSettings`, `useLibraryState`, `useAppShortcuts`) y un pipeline que
ejecuta Vitest, Playwright y `cargo test`.

**Por qué.** El monólito inicial hacía difícil localizar el CSS de un tema y
cargaba código que casi nunca se usa. Separar módulos y diferir componentes
reduce el coste de arranque y hace que cada cambio toque un archivo identifiable.
El pipeline con tres suites verifica que un cambio visual no rompa ni el
contrato IPC ni el backend Rust.

**Alternativas descartadas.** Un único `App.css` y un único `App.tsx` gigantes:
funcionaban, pero cualquier cambio de tema obligaba a recorrer miles de líneas.

**Consecuencia.** `npm run pipeline` es la puerta de entrada antes de commitear;
los cambios visuales se revisan además con capturas reales porque los snapshots
automáticos no cubren los cinco temas nuevos.

---

## Resumen

| Decisión | Alternativa descartada | Detalle |
|---|---|---|
| Rust + React + Tauri | PySide6, Electron | [ADR 0009](adr/0009-migracion-tauri-2-rust.md) |
| Local-first, sin login ni streaming | Servidor con cuentas, streaming | § 2 |
| SQLite + FTS5 | Postgres/MySQL, JSON plano | [ADR 0016](adr/0016-migraciones-y-hardening-bd.md) |
| `data-theme` fijo + `data-skin` | Cambiar `data-theme` | [ADR 0019](adr/0019-temas-propios-estructurales.md) |
| Bibliotecas con estructura única | Grilla con otro color | § 5 |
| Puente HTTP + PIN para el celular | WebSocket/SSE | § 6 |
| Notificación nativa + toast web | Sólo toast dentro de la ventana | § 7 |
| Foto CC0 local | SVG, imagen remota | § 8 |
| Sin instalador/updater/firma | Pipeline de release con secretos | § 9 |
| CSS modular, lazy y hooks separados | Monólito `App.css`/`App.tsx` | § 10 |
