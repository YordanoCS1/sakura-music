# ADR-0007 · Deshacer un lote de tags con manifiestos JSON

- **Estado:** Vigente
- **Fecha:** 2026-11-07 (formalizada)
- **Reflejo en el código:** `sakura/core/tag_history.py`,
  `sakura/ui/widgets/batch_editor.py`, `sakura/ui/pages/library.py`

## Contexto

Editar los tags de 200 pistas en lote es fácil de hacer y difícil de deshacer.
Si el usuario escribe un género equivocado o deja un campo mal, necesita volver
al estado anterior sin perder lo que ya tenía bien.

La forma naive de deshacer sería guardar una copia de cada archivo antes de
editarlo. Con audio, eso duplica gigabytes de datos y tarda el doble de tiempo.

## Decisión

No se copia el audio. Se guarda un **manifiesto JSON**
(`Historial/AAAAmmdd-HHMMSS-xxxxxx.json`) con, por cada cambio:

- la ruta del archivo;
- el campo que cambió;
- el valor **anterior** y el valor **nuevo**.

El botón **Deshacer último lote** aplica el manifiesto al revés, con una
regla de seguridad:

- restaura el valor anterior **solo si el archivo sigue con el valor que dejó
  el lote**;
- si alguien reetiquetó el archivo por fuera, esa pista se **saltea** para no
  pisar el cambio externo;
- si no hubo errores, el manifiesto se borra.

Se conservan los **20 manifiestos más nuevos** (`MAX_MANIFESTS`). Un manifiesto
corrupto se descarta y se busca el anterior.

La regla “un campo vacío no se toca” en el editor en lote reduce la superficie
de daño: un campo dejado en blanco no entra en el manifiesto porque no se
escribía.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Copiar cada archivo antes de editar | Duplica gigabytes y duplica el tiempo de I/O |
| No ofrecer deshacer | Un clic mal dado en 200 pistas es irrecuperable |
| Restaurar siempre, aunque el archivo haya cambiado | Pisa ediciones legítimas posteriores; peor que no restaurar |
| Versionado completo del tag | Complejidad innecesaria para una app monousuario |

## Consecuencias

**Positivas**

- Deshacer cuesta bytes, no gigabytes.
- La regla de “no pisar cambios externos” hace que el deshacer sea seguro.
- El manifiesto también sirve de auditoría: qué cambió cada lote y cuándo.

**Negativas / a tener en cuenta**

- Solo deshace **tags de texto**. Si el lote cambió una portada y eso no quedó
  en el manifiesto, no se restaura.
- Solo existe el último lote deshacedible a la vez (ver el botón en la barra):
  deshacer dos veces seguidas consume el manifiesto.
- La restauración escribe los archivos otra vez: si un archivo se borró,
  fallará y se informa como error sin frenar el resto.

## Verificación

`test_tag_history.py` y `test_batch_editor.py` cubren guardar, leer, revertir,
saltar cambios externos y poda a 20 manifiestos.
