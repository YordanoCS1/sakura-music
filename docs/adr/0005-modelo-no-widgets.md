# ADR-0005 · Biblioteca con modelo Qt, no con un widget por fila

- **Estado:** Vigente
- **Fecha:** 2026-11-07 (formalizada)
- **Reflejo en el código:** `sakura/ui/models/track_model.py`,
  `sakura/ui/models/album_model.py`, `sakura/ui/widgets/library_views.py`,
  `sakura/ui/pages/library.py`

## Contexto

Con miles de pistas, una lista hecha de un `QWidget` por fila (dentro de un
`QScrollArea`) se arrastra: cada widget responde a resize, repaint y al QSS, y
crear miles de ellos al escanear congela la app. Además, ordenar y filtrar
sobre widgets obligaba a manipular la UI en vez de a los datos.

Qt ya trae el patrón para este problema: **Modelo/Vista**, donde la vista solo
pinta lo visible y el modelo guarda los datos.

## Decisión

La Biblioteca usa **`QAbstractTableModel` + `QAbstractListModel` con
`QTableView`/`QListView`**:

- `TrackTableModel` guarda las pistas y `TrackFilterProxy` filtra y ordena sin
  tocar la vista.
- La vista pinta únicamente las filas visibles; con 10.000 pistas, el costo de
  pintura no crece con la colección.
- Las claves de orden son **strings de ancho fijo**, porque Qt no compara bien
  tuplas de Python (su `lessThan` devolvía `False` en ambos sentidos). Los
  valores vacíos se mandan al final con un prefijo.
- Las seis vistas (`table`, `grid`, `mosaic`, `albums`, `discs`, `carousel`) son
  **presentaciones del mismo modelo**, no datos duplicados: cambiar de vista no
  reescanea ni reordena la fuente.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Un widget por fila en `QScrollArea` | Lento con miles de pistas; el QSS se reaplica a todo |
| `QListWidget` con `QListWidgetItem` | Mismo costo por ítem; ordenar es manipular la UI |
| Vista web / virtualización manual | Reinventar lo que Qt ya hace, con más bugs |

## Consecuencias

**Positivas**

- Rendimiento estable con bibliotecas grandes.
- Filtrar, ordenar y cambiar de vista no mutan los datos.
- Los delegates (`track_delegates.py`) aíslan el pintado de cada vista: agregar
  una vista no toca el modelo.

**Negativas / a tener en cuenta**

- Hay que aprender el contrato de `data()`, `rowCount()` y el proxy de filtrado;
  el orden por strings de ancho fijo es sutil y está cubierto por tests.
- Las vistas custom (discos, carrusel) necesitan delegates propios: no son
  gratis.
- La selección entre vistas debe sincronizarse manualmente (fuentes de selección
  compartidas en `LibraryPage`).

## Verificación

`test_track_model.py` y `test_album_model.py` cubren filtrado, orden y
agrupamiento; `test_library_page.py` cubre el comportamiento integrado.
