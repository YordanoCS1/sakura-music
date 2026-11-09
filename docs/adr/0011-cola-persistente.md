# ADR 0011: Persistir la cola de descargas y reanudar al abrir

## Estado
Aceptado

## Contexto
La v1 persistía la cola en `download_queue.json` y reanudaba trabajos al
arrancar. La migración (ADR 0009) dejó la cola 100 % en memoria: cerrar la app
a mitad de ruta vaciaba Cola y cualquier descarga interrumpida se perdía de
vista. La deuda quedó documentada en el ADR 0010. Los usuarios esperan que sus
2 descargas activas sobrevivan a un cierre accidental.

## Decisión

1. **Foto en disco.** `src-tauri/src/queue.rs` guarda `download_queue.json` en
   la carpeta de datos con `write_atomic` (tope de 100 filas, las más
   recientes). Cada cambio de la cola en el frontend dispara
   `save_download_queue`.
2. **Reanudación.** Al arrancar, `get_download_queue` restaura las filas; las
   que estaban en curso (`en cola`, `descargando`, `convirtiendo audio`) vuelven
   como `interrumpida` (`reconcile_status`) y el frontend las relanza con el
   mismo `id`, formato y carpeta destino, respetando el límite de 2 en
   paralelo. yt-dlp reinicia cada archivo desde cero: no se continúa a mitad.
3. **Tolerancia.** Archivo ausente o corrupto → cola vacía, sin romper el
   arranque. `clear_download_queue` borra el archivo cuando la cola se vacía.
4. Las filas terminadas/canceladas/con error quedan como historial hasta que
   el usuario las limpio con **Limpiar terminadas** (que reescribe la foto).

## Consecuencias

### Positivas
- Cerrar la app ya no pierde trabajo: la Cola vuelve como estaba y lo
  interrumpido sigue solo.
- La persistencia es atómica y acotada; no crece sin control entre sesiones.

### Negativas / límites
- La reanudación reinicia el archivo desde cero (yt-dlp no ofrece resume a
  nivel de nuestro wrapper).
- Sin historial de 1000 entradas como la v1: solo 100 filas recientes.
- `file_path` y `output_dir` ahora se guardan por fila; la miniatura no se
  persiste (vuelve en `null` el próximo arranque).

## Reflejo en el código
`src-tauri/src/queue.rs` (nuevo), `src-tauri/src/paths.rs`
(`queue_file`), `src-tauri/src/lib.rs` (`get_download_queue`,
`save_download_queue`, `clear_download_queue`), `src/App.tsx`
(`PersistedDownload`, restauración al montar, guardado tras cada cambio,
reanudación de `interrumpida`, aviso en Cola).
