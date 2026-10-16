"""La flor de cerezo que identifica a Sakura Music.

Se dibuja con `QPainter` sobre un lienzo normalizado y se escala al tamano
pedido, igual que `icons.py` arma el SVG de Lucide en memoria: no hay archivos
de imagen que acompanar al ejecutable ni `QtWebEngine` que asome.

Vive en su propio modulo porque la pintan tres sitios distintos: la marca del
lateral y del topbar, los botones de marca y el logo grande. Antes la geometria
estaba duplicada entre `app._app_icon` (cinco elipses) y `BlossomSeal`
(curvas Bezier), y las dos se vebian distintas.
"""

from __future__ import annotations

from PySide6.QtCore import QPointF, Qt
from PySide6.QtGui import (
    QColor,
    QIcon,
    QPainter,
    QPainterPath,
    QPen,
    QPixmap,
    QRadialGradient,
)

from .theme import tint

# Cantidad de petalos. La sakura verdadera tiene cinco, con una muesca en la
# punta; aca se simplifica a cinco petalos redondos para que se lea bien a
# 16 px, que es el tamano mas chico que se usa en un boton.
PETALOS = 5

# Everything del lienzo normalizado: la punta del petalo mas externo llega a
# RADIO, y el resto se deriva de ahi.
RADIO = 43.0
BASE_PETALO = 9.0
CENTER_R = 8.5

# Pétalos sueltos que caen alrededor de la flor: (x, y, ancho, angulo) en el
# lienzo normalizado. Son los que le dan aire al logo grande.
PETALOS_CAIDOS = (
    (17.0, 26.0, 10.0, 25.0),
    (83.0, 35.0, 8.5, -24.0),
    (28.0, 84.0, 7.0, 42.0),
)


def petalo_path() -> QPainterPath:
    """Un petalo de sakura, de base (0, -BASE_PETALO) a punta (0, -RADIO).

    La punta tiene una muesca, que es lo que hace reconocible a una sakura y no
    a una flor de cinco petalos cualquiera. La base arranca ancha para que los
    petalos se toquen en el centro: si arrancan finos quedan huecos y la flor se
    ve como una estrella.
    """
    path = QPainterPath()
    path.moveTo(0.0, -BASE_PETALO)
    path.cubicTo(13.0, -14.0, 14.0, -34.0, 4.5, -42.0)
    path.quadTo(2.0, -43.0, 0.0, -40.5)
    path.quadTo(-2.0, -43.0, -4.5, -42.0)
    path.cubicTo(-14.0, -34.0, -13.0, -14.0, 0.0, -BASE_PETALO)
    return path


def paint(
    pintor: QPainter,
    center: QPointF,
    radio: float,
    *,
    petalos: str,
    border: str | None = None,
    thickness_border: float = 0.0,
    center_color: str | None = None,
    center_border: str | None = None,
    halo: str | None = None,
    alpha_halo: int = 120,
    caidos: bool = False,
) -> None:
    """Pinta la flor centrada en `centro`, con la punta a `radio` pixeles.

    `radio` es la unica medida: el resto sale de ahi, asi que la misma flor
    sirve para un boton de 16 px y para el logo de la ventana.
    """
    scale = radio / RADIO
    pintor.save()
    pintor.setRenderHint(QPainter.RenderHint.Antialiasing, True)

    if halo:
        # El halo es mas ancho que la flor: si no, queda pegado a la punta de
        # los petalos y se ve como una mancha, no como un resplandor.
        radio_halo = radio * 1.3
        gradient = QRadialGradient(center, radio_halo)
        start = QColor(halo)
        start.setAlpha(alpha_halo)
        end = QColor(halo)
        end.setAlpha(0)
        gradient.setColorAt(0.0, start)
        gradient.setColorAt(1.0, end)
        pintor.setPen(Qt.PenStyle.NoPen)
        pintor.setBrush(gradient)
        pintor.drawEllipse(center, radio_halo, radio_halo)

    if caidos:
        for x, y, width, angulo in PETALOS_CAIDOS:
            pintor.save()
            pintor.translate(center)
            pintor.scale(scale, scale)
            pintor.translate(x, y)
            pintor.rotate(angulo)
            loose = QColor(halo or petalos)
            loose.setAlpha(150)
            pintor.setBrush(loose)
            pintor.setPen(Qt.PenStyle.NoPen)
            pintor.drawEllipse(QPointF(0, 0), width / 2, width / 4)
            pintor.restore()

    # El borde se mide en pixeles reales, no en unidades del lienzo: a 16 px un
    # borde proporcional quedaria por debajo de un pixel y solo engorda el
    # petalo. Por eso se dibuja solo si queda a un pixel entero.
    brush = Qt.PenStyle.NoPen
    if border:
        thickness = max(1.0, round(thickness_border or radio * 0.04))
        brush = QPen(QColor(border), thickness)

    pintor.translate(center)
    pintor.scale(scale, scale)
    forma = petalo_path()
    pintor.setBrush(QColor(petalos))
    pintor.setPen(brush)
    for idx in range(PETALOS):
        pintor.save()
        pintor.rotate(-90 + idx * 360 / PETALOS)
        pintor.drawPath(forma)
        pintor.restore()

    if center_color:
        pintor.resetTransform()
        pintor.translate(center)
        radio_center = CENTER_R * scale
        if center_border:
            pintor.setPen(QPen(QColor(center_border), max(1.0, radio_center * 0.28)))
        else:
            pintor.setPen(Qt.PenStyle.NoPen)
        pintor.setBrush(QColor(center_color))
        pintor.drawEllipse(QPointF(0, 0), radio_center, radio_center)

    pintor.restore()


def render(
    color: str,
    size: int,
    *,
    border: str | None = None,
    center_color: str | None = None,
    center_border: str | None = None,
) -> QPixmap:
    """La flor simple, para la marca y para los botones.

    `size` es el lado logico del pixmap; se dibuja a doble resolucion para que
    no se vea borroso en pantallas HiDPI, igual que hace `icons.render`.
    """
    ratio = 2
    px = QPixmap(size * ratio, size * ratio)
    px.setDevicePixelRatio(ratio)
    px.fill(Qt.GlobalColor.transparent)

    pintor = QPainter(px)
    center = QPointF(size / 2, size / 2)
    paint(
        pintor,
        center,
        size * 0.46,
        petalos=color,
        border=border,
        center_color=center_color or color,
        center_border=center_border,
    )
    pintor.end()
    return px


def render_logo(
    color: str,
    size: int,
    *,
    halo: str | None = None,
    center_border: str | None = None,
) -> QPixmap:
    """La flor completa: halo, petalos caidos y los cinco petalos.

    Para tamaños grandes (el icono de la ventana, el hero de inicio). A 16 px
    el halo y los petalos caidos se convertiran en manchas.
    """
    ratio = 2
    px = QPixmap(size * ratio, size * ratio)
    px.setDevicePixelRatio(ratio)
    px.fill(Qt.GlobalColor.transparent)

    pintor = QPainter(px)
    center = QPointF(size / 2, size / 2)
    paint(
        pintor,
        center,
        size * 0.38,
        petalos=color,
        border=halo,
        center_color=color,
        center_border=center_border,
        halo=halo,
        caidos=True,
    )
    pintor.end()
    return px


def icon(color: str, size: int = 18, dimmed: str | None = None) -> QIcon:
    """QIcon con estados Normal y Disabled, para que el QSS pueda atenuarla."""
    result = QIcon()
    result.addPixmap(render(color, size), QIcon.Mode.Normal, QIcon.State.Off)

    muted = QColor(dimmed) if dimmed else QColor(color)
    if not dimmed:
        muted.setAlpha(110)
    result.addPixmap(
        render(muted.name(QColor.NameFormat.HexArgb), size),
        QIcon.Mode.Disabled,
        QIcon.State.Off,
    )
    return result


def widget(size: int, *, color: str | None = None, halo: str | None = None) -> QPixmap:
    """`render_logo` con los colores del tema activo."""
    from . import theme as th

    t = th.active()
    return render_logo(
        color or t.accent,
        size,
        halo=tint(t.surface, t.accent, 0.5) if halo is None else halo,
        center_border=t.bg,
    )


__all__ = [
    "PETALOS",
    "PETALOS_CAIDOS",
    "icon",
    "paint",
    "petalo_path",
    "render",
    "render_logo",
    "widget",
]