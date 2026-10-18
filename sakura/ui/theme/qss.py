"""Generador del stylesheet completo a partir de los tokens del tema."""

from __future__ import annotations

from .tokens import (
    FONT_STACK,
    Theme,
    app_bg,
    bar_fill,
    card_fill,
    edge,
    fs,
    heading_rules,
    px,
    tint,
)


def build_qss(t: Theme) -> str:
    """Genera el stylesheet completo de la aplicacion desde los tokens."""
    bord = edge(t)
    root = app_bg(t)
    sidebar = bar_fill(t, t.surface, t.surface_alt)
    topbar = bar_fill(t, t.surface, t.bg, vertical=True)
    card = card_fill(t)
    card_hover = card_fill(t, t.surface_hover, t.surface_alt)
    form_panel = card_fill(t, t.surface, t.surface_alt)
    extra = heading_rules(t)
    return f"""
* {{
    font-family: {FONT_STACK};
    outline: none;
}}

QWidget {{
    background: transparent;
    color: {t.text};
}}

QToolTip {{
    background: {t.surface_alt};
    color: {t.text};
    border: {bord};
    border-radius: {t.radius_sm}px;
    padding: {px(t, 5)} {px(t, 9)};
}}

/* ---------- fondo global ---------- */
#Root {{
    background: {root};
}}

/* Los dialogos son ventanas de primer nivel: no heredan el fondo de la ventana
   principal y salen blancos con texto claro encima. */
QDialog {{
    background: {t.bg};
}}

/* ---------- barra de titulo ---------- */
#TitleBar {{
    background: rgba(0,0,0,0);
    border-bottom: {bord};
}}
#TitleBar[hovered="true"] {{
    background: {t.surface_alt};
}}
/* Controles de ventana: cuadrados a sangre, hover tenue y cerrar en rojo. */
QPushButton#IconButton[winControl="true"] {{
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
}}
QPushButton#IconButton[winControl="true"]:hover {{
    background: {t.surface_hover};
    border: none;
}}
QPushButton#IconButton[winControl="true"][variant="close"]:hover {{
    background: {t.danger};
}}
QPushButton#IconButton[variant="close"]:hover {{
    background: {t.danger};
}}
#TitleBarTitle {{
    color: {t.text_muted};
    font-size: {fs('caption')};
    font-weight: 600;
}}

/* ---------- sidebar ---------- */
#Sidebar {{
    background: {sidebar};
    border: {bord};
    border-left: none;
    border-top: none;
    border-bottom: none;
    border-top-right-radius: {t.radius + 12}px;
    border-bottom-right-radius: {t.radius + 12}px;
    padding-top: 4px;
}}

QPushButton#NavButton {{
    background: transparent;
    color: {t.text_dim};
    border: 1px solid transparent;
    border-radius: {t.radius}px;
    padding: {px(t, 10)} {px(t, 14)};
    font-size: {fs('label')};
    font-weight: 600;
    text-align: left;
    /* Sin `transition`: es CSS, no QSS. Qt lo rechaza con "Unknown property"
       en cada boton de la barra lateral, Filling the console on each repaint. */
}}
QPushButton#NavButton:hover {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 {t.surface_hover}, stop:1 {t.surface_alt});
    color: {t.text};
    border-color: {t.border};
}}
QPushButton#NavButton:checked {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 {tint(t.surface_alt, t.accent, 0.18)}, stop:1 {tint(t.bg, t.accent, 0.15)});
    color: {t.accent};
    border-color: {tint(t.accent, t.bg, 0.35)};
    border-left: 3px solid {t.accent};
    padding-left: {px(t, 12)};
}}
QPushButton#NavButton[slim="true"] {{
    text-align: center;
    padding: {px(t, 8)};
}}

#SidebarBrandSubtitle {{
    color: {t.text_muted};
    font-size: {fs('nano')};
    font-weight: 600;
    letter-spacing: 0.5px;
    background: transparent;
}}

#SidebarSection {{
    color: {t.text_muted};
    font-size: {fs('micro')};
    font-weight: 700;
    padding: 0 {px(t, 14)};
    letter-spacing: 0.6px;
}}

/* ---------- barra superior ---------- */
#TopBar {{
    background: {topbar};
    border-bottom: {bord};
}}
#BrandTitle {{
    color: {t.text};
    font-size: {fs('lead')};
    font-weight: 800;
    letter-spacing: -0.2px;
}}
#NavCapsule {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius_pill}px;
}}
QLineEdit#SearchInput {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius_pill}px;
    padding: {px(t, 8)} {px(t, 16)};
    color: {t.text};
    font-size: {fs('label')};
}}
QLineEdit#SearchInput:focus {{
    border: 1px solid {t.accent};
}}
QLineEdit#SearchInput::placeholder {{
    color: {t.text_muted};
}}

/* ---------- armazon: pestanas, barra inferior e inspector ---------- */
#TabBar {{
    background: {bar_fill(t, t.surface_alt, t.surface)};
    border-bottom: {bord};
}}
#BottomBar {{
    background: {bar_fill(t, t.surface_alt, t.surface)};
    border-top: {bord};
}}
QPushButton#TabButton {{
    background: transparent;
    color: {t.text_dim};
    border: none;
    border-bottom: 2px solid transparent;
    padding: {px(t, 9)} {px(t, 18)};
    font-size: {fs('label')};
    font-weight: 600;
}}
QPushButton#TabButton:hover {{
    color: {t.text};
    background: {t.surface_hover};
}}
QPushButton#TabButton:checked {{
    color: {t.accent};
    border-bottom: 2px solid {t.accent};
}}
#Inspector {{
    background: {bar_fill(t, t.surface, t.surface_alt)};
    border-left: {bord};
}}
#InspectorTitle {{
    color: {t.text_muted};
    font-size: {fs('micro')};
    font-weight: 700;
    letter-spacing: 0.6px;
}}
#InspectorEmpty {{
    color: {t.text_muted};
    font-size: {fs('caption')};
}}
#InspectorRow {{
    background: transparent;
    border: none;
    border-bottom: {bord};
}}
QPushButton#RailToggle {{
    background: transparent;
    color: {t.text_muted};
    border: {bord};
    border-radius: {t.radius_sm}px;
    font-size: {fs('caption')};
    font-weight: 700;
    padding: {px(t, 3)};
}}
QPushButton#RailToggle:hover {{
    color: {t.text};
    background: {t.surface_hover};
}}

/* ---------- contenido ---------- */
#PageHeader {{
    color: {t.text};
    font-size: {fs('display')};
    font-weight: 800;
}}
#PageSubtitle {{
    color: {t.text_dim};
    font-size: {fs('label')};
}}

/* ---------- area central ---------- */
#ScrollArea, #Page {{
    background: {t.bg};
}}
#ScrollArea > QWidget > QWidget {{
    background: transparent;
}}

/* ---------- progreso ---------- */
QProgressBar {{
    background: {t.surface_hover};
    border: none;
    border-radius: 2px;
    max-height: 4px;
    min-height: 4px;
}}
QProgressBar::chunk {{
    background: {t.accent};
    border-radius: 2px;
}}
QProgressBar#ProgressInverted::chunk {{
    background: {t.success};
}}

/* ---------- botones ---------- */
QPushButton#IconButton {{
    background: transparent;
    border: 1px solid transparent;
    border-radius: {t.radius_pill}px;
    padding: {px(t, 6)};
}}
QPushButton#IconButton:hover {{
    background: {t.surface_hover};
    border-color: {t.border};
}}
QPushButton#IconButton:disabled {{
    background: transparent;
}}
QPushButton#IconButton:disabled * {{
    color: {t.text_muted};
}}

QPushButton#PlayButton {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {t.text}, stop:1 {t.text_dim});
    border: {bord};
    border-radius: {t.radius_pill}px;
    padding: {px(t, 10)};
}}
QPushButton#PlayButton:hover {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {t.accent}, stop:1 {t.accent_hover});
    border-color: {t.accent};
}}

QPushButton#AccentButton {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {t.accent}, stop:1 {t.accent_hover});
    color: {t.accent_text};
    border: 1px solid {tint(t.accent, t.bg, 0.35)};
    border-radius: {t.radius}px;
    padding: {px(t, 10)} {px(t, 20)};
    font-size: {fs('label')};
    font-weight: 800;
    letter-spacing: 0.2px;
}}
QPushButton#AccentButton:hover {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {t.accent_hover}, stop:1 {t.accent});
    border-color: {t.accent};
}}

QPushButton#GhostButton {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 {t.surface_alt}, stop:1 {t.surface});
    color: {t.text_dim};
    border: {bord};
    border-radius: {t.radius}px;
    padding: {px(t, 8)} {px(t, 14)};
    font-size: {fs('caption')};
    font-weight: 700;
}}
QPushButton#GhostButton:hover {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 {t.surface_hover}, stop:1 {t.surface_alt});
    color: {t.text};
    border-color: {t.accent};
}}

QPushButton#DangerButton {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {tint(t.bg, t.danger, 0.15)}, stop:1 {tint(t.surface, t.danger, 0.18)});
    color: {t.danger};
    border: 1px solid {t.danger};
    border-radius: {t.radius}px;
    padding: {px(t, 8)} {px(t, 14)};
    font-size: {fs('caption')};
    font-weight: 700;
}}
QPushButton#DangerButton:hover {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {t.danger}, stop:1 {tint(t.danger, t.bg, 0.10)});
    color: {t.bg};
}}

/* ---------- foco (navegacion por teclado) ---------- */
/* Sin un anillo visible, moverse con Tab por la app es a ciegas. */
QPushButton#AccentButton:focus,
QPushButton#GhostButton:focus,
QPushButton#DangerButton:focus {{
    border: 1px solid {t.accent};
}}
QPushButton#IconButton:focus {{
    background: {t.surface_hover};
    border-color: {t.accent};
}}
QPushButton#NavPill:focus,
QPushButton#NavButton:focus,
QPushButton#SegmentButton:focus {{
    border: 1px solid {t.accent};
}}

/* ---------- estados de la cola de descargas ----------
   Chips con fondo tenue y texto del color: un bloque solido saturado se leia
   como una alerta, no como un estado. */
#Badge {{
    border-radius: {t.radius_pill}px;
    padding: {px(t, 3)} {px(t, 10)};
    font-size: {fs('micro')};
    font-weight: 700;
}}
#BadgePending {{
    background: {t.surface_hover};
    color: {t.text_dim};
}}
#BadgeActive {{
    background: {tint(t.bg, t.warning, 0.18)};
    color: {t.warning};
}}
#BadgeDone {{
    background: {tint(t.bg, t.success, 0.18)};
    color: {t.success};
}}
#BadgeFailed {{
    background: {tint(t.bg, t.danger, 0.18)};
    color: {t.danger};
}}
#QueueControls {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius}px;
}}
#QueueStats {{
    color: {t.text_dim};
    font-size: {fs('body_sm')};
    font-weight: 600;
}}
#JobRow {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius}px;
}}
#JobRow[failed="true"] {{
    border-left: 3px solid {t.danger};
}}
#JobDetail {{
    color: {t.text_muted};
    font-size: {fs('micro')};
    background: transparent;
}}
QProgressBar#Progress, QProgressBar#ProgressInverted {{
    min-height: 6px;
    max-height: 6px;
    border-radius: 3px;
}}
QProgressBar#Progress::chunk, QProgressBar#ProgressInverted::chunk {{
    border-radius: 3px;
}}

/* ---------- scrollbar ---------- */
QScrollBar:vertical {{
    background: transparent;
    width: 10px;
    margin: 0;
}}
QScrollBar::handle:vertical {{
    background: {t.surface_hover};
    border-radius: 5px;
    min-height: 40px;
}}
QScrollBar::handle:vertical:hover {{
    background: {t.border};
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
    height: 0;
}}
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {{
    background: transparent;
}}

/* ---------- listas y cuadricula ---------- */
QListWidget {{
    background: {t.bg};
    border: {bord};
    border-radius: {t.radius}px;
    color: {t.text};
    font-size: {fs('caption')};
    padding: {px(t, 4)};
}}
QListWidget::item {{
    border-radius: {t.radius_sm}px;
    padding: {px(t, 6)} {px(t, 10)};
    margin: 1px 0;
}}
QListWidget::item:hover {{
background: {t.surface_hover};
}}
QListWidget::item:selected {{
background: {t.selection};
color: {t.selection_text};
}}

QListView#TrackGrid {{
    background: {t.bg};
    border: none;
    color: {t.text};
    outline: none;
    padding: {px(t, 6)};
}}
QListView#TrackGrid::item {{
    background: transparent;
    border: none;
    padding: 0;
    margin: 4px;
}}
QListView#TrackGrid::item:selected {{
    background: transparent;
    border: none;
}}

/* Franja de subcarpetas como chips en una sola linea. */
QListWidget#LibraryFolderGrid {{
    background: transparent;
    border: none;
    color: {t.text_dim};
    outline: none;
}}
QListWidget#LibraryFolderGrid::item {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius_pill}px;
    padding: {px(t, 4)} {px(t, 12)};
    margin: {px(t, 3)};
}}
QListWidget#LibraryFolderGrid::item:hover {{
    background: {t.surface_hover};
    border-color: {tint(t.border, t.accent, 0.45)};
    color: {t.text};
}}
QListWidget#LibraryFolderGrid::item:selected {{
    background: {t.selection};
    border-color: {tint(t.border, t.accent, 0.6)};
    color: {t.selection_text};
}}

/* ---------- barra, seleccion y detalle de la biblioteca ---------- */
#LibraryToolbar {{
    background: transparent;
}}
#ToolbarSeparator {{
    background: {t.border};
    border: none;
}}
#ToolbarStats {{
    color: {t.text_muted};
    font-size: {fs('caption')};
}}
#SegmentedControl {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius_pill}px;
}}
QPushButton#SegmentButton {{
    background: transparent;
    border: none;
    border-radius: {t.radius_sm}px;
}}
QPushButton#SegmentButton:hover {{
    background: {t.surface_hover};
}}
QPushButton#SegmentButton:checked {{
    background: {tint(t.surface_alt, t.accent, 0.32)};
}}
QPushButton#SegmentButton[segmentKind="text"] {{
    padding: 5px 16px;
}}
#Breadcrumb {{
    color: {t.text_dim};
    font-size: {fs('label')};
    font-weight: 700;
}}
#SelectionBar {{
    background: {tint(t.surface, t.accent, 0.10)};
    border: 1px solid {tint(t.border, t.accent, 0.35)};
    border-radius: {t.radius}px;
}}
#SelectionCount {{
    color: {t.text};
    font-size: {fs('label')};
    font-weight: 700;
}}
#TagChip {{
    color: {t.text_dim};
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius_pill}px;
    padding: {px(t, 3)} {px(t, 8)};
    font-size: {fs('micro')};
}}
#DetailTitle {{
    color: {t.text};
    font-size: {fs('body')};
    font-weight: 700;
}}
#DetailCover {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius}px;
}}

/* ---------- tabla de la biblioteca ---------- */
QTableView {{
background: {t.bg};
alternate-background-color: {t.surface};
border: none;
gridline-color: transparent;
color: {t.text};
selection-background-color: {t.selection};
selection-color: {t.selection_text};
font-size: {fs('label')};
}}
QTableView::item {{
padding: 0 {px(t, 10)};
border: none;
}}
QTableView::item:hover {{
background: {t.surface_hover};
}}
QTableView::item:selected {{
background: {t.selection};
color: {t.selection_text};
}}
QHeaderView::section {{
    background: {t.bg};
    color: {t.text_muted};
    border: none;
    border-bottom: {bord};
    padding: {px(t, 8)} {px(t, 10)};
    font-size: {fs('micro')};
    font-weight: 700;
    letter-spacing: 0.5px;
}}
QTableCornerButton::section {{
    background: {t.bg};
    border: none;
}}

/* ---------- separadores / varios ---------- */
#Divider {{
    background: {t.border};
    max-height: 1px;
    min-height: 1px;
    border: none;
}}
#MessageBlock {{
    background: transparent;
}}
#EmptyIcon {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: 32px;
}}
#EmptyTitle {{
    color: {t.text};
    font-size: {fs('heading')};
    font-weight: 700;
}}
#EmptyState {{
    color: {t.text_muted};
    font-size: {fs('label')};
}}
#Card {{
background: {t.surface_alt};
border: {bord};
border-radius: {t.radius}px;
}}
#CardTitle {{
color: {t.text};
font-size: {fs('body_sm')};
font-weight: 700;
}}

/* ---------- tarjeta de resultado de busqueda ---------- */
#ResultCard {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius}px;
}}
#ResultCard:hover {{
    background: {t.surface_hover};
    border-color: {t.accent};
}}
#ResultCardTitle {{
    color: {t.text};
    font-size: {fs('body_sm')};
    font-weight: 600;
    background: transparent;
}}
#ResultCardMeta {{
    color: {t.text_muted};
    font-size: {fs('micro')};
    background: transparent;
}}

/* ---------- inicio y dashboard de musica ---------- */
#HeroBanner {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {tint(t.surface_alt, t.accent, 0.30)},
        stop:0.45 {t.surface_alt},
        stop:1 {t.surface});
    border: 1px solid {tint(t.border, t.accent, 0.30)};
    border-radius: {t.radius + 8}px;
    padding: 4px;
}}
#HeroTitle {{
    color: {t.text};
    font-size: {fs('title')};
    font-weight: 800;
    letter-spacing: -0.3px;
}}
#HeroSubtitle {{
    color: {t.text_dim};
    font-size: {fs('label')};
    line-height: 1.4;
}}
#HeroBadge {{
    color: {t.accent};
    background: {tint(t.bg, t.accent, 0.18)};
    border: 1px solid {t.accent};
    border-radius: {t.radius_pill}px;
    padding: 5px 12px;
    font-size: {fs('nano')};
    font-weight: 800;
    letter-spacing: 0.9px;
}}
#HeroPill {{
    color: {t.text};
    background: {tint(t.bg, t.accent, 0.12)};
    border: {bord};
    border-radius: {t.radius_pill}px;
    padding: 5px 10px;
    font-size: {fs('nano')};
    font-weight: 700;
    letter-spacing: 0.8px;
}}
#HeroVisual {{
    background: qradialgradient(cx:1, cy:0.5, radius:1,
        stop:0 {tint(t.accent, t.bg, 0.45)},
        stop:0.5 {tint(t.accent, t.surface_alt, 0.18)},
        stop:1 transparent);
    border: 1px solid {tint(t.border, t.accent, 0.25)};
    border-radius: {t.radius}px;
}}

#StatTile {{
    background: {card};
    border: {bord};
    border-radius: {t.radius}px;
}}
#StatTile:hover {{
    background: {card_hover};
    border: 1px solid {t.accent};
}}
#Card {{
    background: {card};
    border: {bord};
    border-radius: {t.radius}px;
}}
#Card:hover {{
    border: 1px solid {t.accent};
    background: {card_hover};
}}
#CardIcon {{
    background: {tint(t.bg, t.accent, 0.15)};
    border: 1px solid {tint(t.accent, t.bg, 0.40)};
    border-radius: 12px;
}}
#StatValue {{
    color: {t.text};
    font-size: {fs('display')};
    font-weight: 800;
}}
#StatLabel {{
    color: {t.text_muted};
    font-size: {fs('micro')};
    font-weight: 700;
    letter-spacing: 0.5px;
}}

/* ---------- barra de navegacion en capsula (TopNav) ---------- */
QPushButton#NavPill {{
    background: transparent;
    color: {t.text_dim};
    border: none;
    border-radius: {t.radius_sm + 2}px;
    padding: 6px 14px;
    font-size: {fs('label')};
    font-weight: 600;
}}
QPushButton#NavPill:hover {{
    background: {t.surface_hover};
    color: {t.text};
}}
QPushButton#NavPill:checked {{
    background: {tint(t.surface_alt, t.accent, 0.35)};
    color: {t.accent};
}}

#Callout {{
    color: {t.text_dim};
    font-size: {fs('label')};
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius}px;
    padding: {px(t, 12)} {px(t, 14)};
}}
#FieldLabel {{
    color: {t.text_muted};
    font-size: {fs('micro')};
    font-weight: 700;
    letter-spacing: 0.4px;
}}

/* ---------- editor musical de metadatos ---------- */
#MetadataEyebrow {{
    color: {t.accent};
    font-size: {fs('nano')};
    font-weight: 800;
    letter-spacing: 1.1px;
}}
#MetadataTrackTitle {{
    color: {t.text};
    font-size: {fs('display')};
    font-weight: 800;
}}
#MetadataPageTitle {{
    color: {t.text};
    font-size: {fs('heading')};
    font-weight: 800;
}}
#MetadataTrackArtist, #MetadataHint, #MetadataPath {{
    color: {t.text_dim};
    font-size: {fs('caption')};
}}
#MetadataPath {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius_pill}px;
    padding: 8px 12px;
}}
#MetadataArtworkPanel {{
    background: {t.surface_alt};
    border: 1px solid {tint(t.border, t.accent, 0.40)};
    border-radius: {t.radius + 8}px;
}}
#MetadataCover {{
    background: {t.bg};
    border: {bord};
    border-radius: {t.radius}px;
}}
#MetadataFormPanel {{
    background: {form_panel};
    border: {bord};
    border-radius: {t.radius + 8}px;
}}
#MetadataSearchPanel {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 {tint(t.surface_alt, t.accent, 0.12)}, stop:1 {t.surface});
    border: 1px solid {tint(t.border, t.accent, 0.30)};
    border-radius: {t.radius + 4}px;
}}
#MetadataResultsPanel {{
    background: {t.surface};
    border: {bord};
    border-radius: {t.radius + 6}px;
}}
#MetadataResultsList {{
    background: {t.bg};
    border: {bord};
    border-radius: {t.radius}px;
    padding: 5px;
}}
#MetadataResultsList::item {{
    border-radius: {t.radius_sm}px;
    margin: 2px 0;
    padding: 3px;
}}
#MetadataResultsList::item:hover {{
    background: {t.surface_hover};
}}
#MetadataResultsList::item:selected {{
    background: {t.selection};
    color: {t.selection_text};
}}
#MetadataSourceBadge {{
    color: {t.accent};
    background: {tint(t.surface_alt, t.accent, 0.14)};
    border: 1px solid {tint(t.accent, t.border, 0.35)};
    border-radius: {t.radius_pill}px;
    padding: 6px 10px;
    font-size: {fs('nano')};
    font-weight: 800;
    letter-spacing: 0.6px;
}}
#MetadataSectionTitle {{
    color: {t.text};
    font-size: {fs('subhead')};
    font-weight: 800;
}}
#MetadataDivider {{
    background: {tint(t.border, t.accent, 0.32)};
    border: none;
}}
QLineEdit#MetadataField {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius_sm + 2}px;
    padding: 8px 12px;
    color: {t.text};
    font-size: {fs('label')};
}}
QLineEdit#MetadataField:focus {{
    border: 1px solid {t.accent};
    background: {tint(t.surface_alt, t.accent, 0.08)};
}}
QLineEdit#MetadataField::placeholder {{
    color: {t.text_muted};
}}
#MetadataGroupTitle {{
    color: {t.text_muted};
    font-size: {fs('micro')};
    font-weight: 800;
    letter-spacing: 0.6px;
}}
#MetadataDirty {{
    color: {t.accent};
    font-size: {fs('caption')};
    font-weight: 700;
}}
QLabel#FieldLabel[modified="true"] {{
    color: {t.accent};
}}
QLineEdit#MetadataField[modified="true"] {{
    border: 1px solid {tint(t.border, t.accent, 0.55)};
}}

/* ---------- ajustes ---------- */
/* Las preferencias se agrupan en tarjetas con encabezado para que la pagina no
   sea una lista plana; los controles toman su color del tema por objectName. */
#SettingsCard {{
    background: {card};
    border: {bord};
    border-radius: {t.radius + 6}px;
}}
#SettingsSection {{
    color: {t.text};
    font-size: {fs('body')};
    font-weight: 800;
}}
#SettingTitle {{
    color: {t.text};
    font-size: {fs('label')};
    font-weight: 700;
}}
#SettingsRowIcon {{
    background: transparent;
    border: none;
}}
QComboBox#SettingsControl {{
    background: {t.surface_alt};
    color: {t.text};
    border: {bord};
    border-radius: {t.radius_sm + 2}px;
    padding: {px(t, 8)} {px(t, 12)};
    font-size: {fs('label')};
}}
QComboBox#SettingsControl:hover {{
    background: {t.surface_hover};
    border-color: {t.accent};
}}
QComboBox#SettingsControl:focus {{
    border: 1px solid {t.accent};
}}
QComboBox#SettingsControl QAbstractItemView {{
    background: {t.surface_alt};
    color: {t.text};
    selection-background-color: {t.accent};
    selection-color: {t.accent_text};
    border: {bord};
    padding: {px(t, 4)};
}}
QCheckBox#SettingsCheck {{
    color: {t.text};
    font-size: {fs('label')};
    spacing: 8px;
}}
QCheckBox#SettingsCheck::indicator {{
    width: 18px;
    height: 18px;
    border: {bord};
    border-radius: {t.radius_sm}px;
    background: {t.surface_alt};
}}
QCheckBox#SettingsCheck::indicator:hover {{
    border-color: {t.accent};
}}
QCheckBox#SettingsCheck::indicator:checked {{
    background: {t.accent};
    border-color: {t.accent};
}}

/* ---------- menus desplegables ---------- */
QMenu {{
    background: {t.surface};
    color: {t.text};
    border: {bord};
    border-radius: {t.radius}px;
    padding: {px(t, 6)};
}}
QMenu::item {{
    background: transparent;
    padding: {px(t, 6)} {px(t, 14)};
    border-radius: 4px;
    font-size: {fs('caption')};
}}
QMenu::item:selected {{
    background: {t.surface_hover};
    color: {t.accent};
}}
QMenu::separator {{
    height: 1px;
    background: {t.border};
    margin: 4px 6px;
}}

/* ---------- estudio de iconos ---------- */
/* El dialogo donde se reemplazan iconos por PNG: lista a la izquierda y un mock
   del chrome a la derecha que se repinta en vivo. */
#IconStudio {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {t.bg}, stop:1 {t.surface});
}}
#IconSlotList {{
    background: transparent;
    border: none;
}}
QPushButton#IconSlot {{
    background: transparent;
    color: {t.text_dim};
    border: 1px solid transparent;
    border-radius: {t.radius}px;
    padding: {px(t, 8)} {px(t, 12)};
    font-size: {fs('label')};
    font-weight: 600;
    text-align: left;
}}
QPushButton#IconSlot:hover {{
    background: {t.surface_hover};
    color: {t.text};
}}
QPushButton#IconSlot:checked {{
    background: {tint(t.surface_alt, t.accent, 0.18)};
    color: {t.accent};
    border-color: {tint(t.accent, t.bg, 0.35)};
    border-left: 3px solid {t.accent};
}}
#IconSlotGroup {{
    color: {t.text_muted};
    font-size: {fs('caption')};
    font-weight: 800;
}}
#IconPreview {{
    background: {card};
    border: {bord};
    border-radius: {t.radius + 6}px;
}}
#IconPreviewCaption {{
    color: {t.text_muted};
    font-size: {fs('caption')};
    font-weight: 700;
}}
#IconPreviewLabel {{
    color: {t.text_dim};
    font-size: {fs('micro')};
}}
#IconPreviewBrand {{
    color: {t.text};
    font-size: {fs('label')};
    font-weight: 800;
}}
#IconControls {{
    background: {t.surface_alt};
    border: {bord};
    border-radius: {t.radius + 6}px;
}}
#IconPickPreview {{
    background: {t.surface};
    border: {bord};
    border-radius: {t.radius}px;
}}
{extra}"""