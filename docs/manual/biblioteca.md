# La biblioteca

La pestaña **Biblioteca** lista tu música local, la mantiene al día y te deja
encontrarla rápido. El reproductor vive abajo; esta página es tu catálogo.

## Primer escaneo

La primera vez (o con la caché borrada), la app recorre la carpeta que elegiste
y lee los tags de cada archivo con un motor Rust en paralelo (`rayon`). Miles
de pistas tardan segundos, no minutos.

### Qué lee de cada archivo

| Dato | De dónde sale |
|---|---|
| Título, artista, álbum, artista del álbum, número de pista, año, género | Tags del archivo |
| Duración y formato | Archivo |
| Carátula | Tag embebido, `folder.jpg`/`cover.*` en la carpeta, o placeholder |

Formatos soportados: MP3, FLAC, M4A, Opus, OGG, WAV y AAC.

### La caché

La biblioteca se guarda en `library.sqlite3` en la carpeta de datos de la app.
Al iniciar, Sakura revisa la carpeta elegida y la vigila mientras la app está
abierta. Compara tamaño y fecha de modificación: lee los tags solo de pistas
nuevas o modificadas y quita del índice los archivos que ya no existen. La
primera apertura importa automáticamente la caché antigua `library_cache.json`,
si está presente; el archivo original se conserva.

La opción **Limpiar Caché** en Ajustes borra el índice SQLite; el siguiente
escaneo lo reconstruye desde los archivos. No se pierde música ni tags.

> La música no vive en la carpeta de datos: vive en la carpeta que elegiste
> como biblioteca.

## Las nueve vistas (temas genéricos)

Estas nueve vistas son las de `LibraryTab`, usadas por los **4 temas genéricos**
(M3 Zen, Yoru, Hanabi y Aizuri). Los **13 temas propios** tienen una biblioteca
estructural propia en lugar de este switcher.

| Vista | Ideal para |
|---|---|
| **Carpetas** | Explorador con breadcrumbs: subí y bajá de niveles, clic en cada nivel |
| **Cuadrícula** | Tarjetas con portada grande, título y artista |
| **Tabla** | Ver todo junto: título, artista, álbum, año, duración, tamaño |
| **Álbumes** | Estante con vinilo 3D: agrupado por álbum, con vista detalle |
| **Pared** | Mosaico de portadas filtrado por la carpeta elegida |
| **CDs** | Portadas presentadas como discos |
| **3D (Tilt)** | Portadas con efecto de inclinación tridimensional |
| **Luz (Glow)** | Portadas con resplandor ambiental |
| **Portadas** | Galería de carátulas |

En **Carpetas** ves las subcarpetas como tarjetas; al entrar, las migas muestran
`Artista / Álbum` y podés volver a cualquier nivel. En las demás vistas, navegar
carpetas filtra la lista (con indicador "Filtrando por carpeta: …" y opción de
"Mostrar toda la biblioteca").

## Buscar y filtrar

- **Buscador:** filtra por título, artista o álbum mientras escribís.
- **Chips de formato / Favoritos / Recientes:** filtran por extensión o por
  marca de favorito (ver Inicio para el conteo).
- **Contador:** muestra cuántas canciones matchean.

## Selección múltiple y lote

En Cuadrícula y Tabla, marcá casillas para seleccionar. Al seleccionar más de
una aparece la barra de lote con **Seleccionar todas**, **Deseleccionar** y
**Editar en lote (N)**. También podés usar **Eliminar (N)** para borrar los
archivos seleccionados del disco; la app pide confirmación antes de hacerlo y
el borrado se puede **deshacer** durante unos segundos (ver más abajo). El
detalle de edición está en [metadatos-y-letras.md](metadatos-y-letras.md).

## Reproducción

Hacé clic en una pista para reproducirla. El audio se carga en memoria, así que
Windows no bloquea el archivo: podés editarlo mientras suena. Controles del
reproductor inferior:

- Play/pausa, anterior/siguiente
- Seek (barra de progreso), volumen, mute
- Aleatorio (shuffle)
- Repetición: apagada, todas, una

Al terminar la última pista con la repetición apagada, la app **se detiene**
(no vuelve al inicio como en la v1). Tocando la portada del reproductor se abre
el panel **Ahora suena**, con las pestañas Detalles, Letras, Álbum y Artista.

## Listas (playlists)

La pestaña **Listas** de la navegación guarda tus listas en SQLite (tablas
`playlists` y `playlist_tracks`). Podés **crear**, renombrar y borrar listas,
agregar pistas desde la biblioteca, quitarlas y reordenarlas con las flechas.
Cada lista se persiste entre sesiones y cada tema le da su propio estilo al
panel (los 13 temas propios tienen variantes explícitas).

## Borrado con Deshacer

Cuando borrás pistas, el archivo no se elimina de golpe: se mueve a la carpeta
`trash/` dentro de los datos de la app y aparece un toast con **Deshacer**
durante **9 segundos**. Si lo tocás, vuelven el archivo y su fila en la
biblioteca. Pasado ese tiempo, el archivo queda en la papelera y podés vaciarla
desde **Ajustes → Sistema → Vaciar papelera**, donde también ves el contador de
elementos. El vaciado sí es definitivo.

## La biblioteca está vacía

Si no hay música, ves un estado vacío con **Escanear Carpeta de Música** y
**Escanear Música de Windows** (la carpeta Música oficial de Windows).

## Problemas frecuentes

| Síntoma | Qué revisar |
|---|---|
| No aparece una pista recién descargada | La Cola reescanea sola al terminar; si no, volvé a escanear la carpeta |
| No se ve la portada | El archivo no tiene tag de portada ni `folder.jpg`/`cover.*`: editala |
| La carpeta no abre | La carpeta no existe o Tauri no puede leerla: re-eligí la carpeta |
| Un tema no cambia el color | Cerrá y volvé a abrir: el tema se aplica al instante y se persiste en `localStorage` |
| No aparece la pestaña Listas | Buscala entre las 6 pestañas de la navegación: Inicio, Biblioteca, Buscar, Cola, Listas y Ajustes |

Más en [problemas.md](problemas.md) y en [../nuevas-funciones.md](../nuevas-funciones.md).
