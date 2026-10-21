"""Widgets reutilizables de la interfaz."""

from .bottombar import BottomBar
from .breadcrumb import BreadcrumbBar
from .buttons import IconButton, TextButton
from .dialog import ThemedDialog
from .download_history import DownloadHistoryDialog
from .inspector import InspectorPanel
from .sidebar import Sidebar
from .tabbar import TabBar
from .titlebar import TitleBar

__all__ = [
    "BottomBar",
    "BreadcrumbBar",
    "DownloadHistoryDialog",
    "IconButton",
    "InspectorPanel",
    "Sidebar",
    "TabBar",
    "TextButton",
    "ThemedDialog",
    "TitleBar",
]
