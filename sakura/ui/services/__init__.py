"""Servicios que conectan la logica con Qt (procesos, red, senales)."""

from .downloader import DownloadManager
from .library import LibraryRefresher, LibraryReviewScanner, LibraryScanner
from .lyrics import LyricsEmbedder
from .playlist import PlaylistResolver
from .searcher import SearchService
from .thumbnails import ThumbnailLoader

__all__ = [
    "DownloadManager",
    "LibraryRefresher",
    "LibraryReviewScanner",
    "LibraryScanner",
    "LyricsEmbedder",
    "PlaylistResolver",
    "SearchService",
    "ThumbnailLoader",
]