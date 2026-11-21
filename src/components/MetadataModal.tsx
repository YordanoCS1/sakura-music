import {
  AlertCircle,
  Check,
  ChevronLeft,
  Disc3,
  Globe,
  ImagePlus,
  Layers,
  Link2,
  ListMusic,
  Music2,
  Pencil,
  Save,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { convertFileSrc } from '@tauri-apps/api/core';
import ThemedLoader from './ThemedLoader';
import type {
  CatalogAlbum,
  CatalogAlbumTrack,
  CatalogCandidate,
  CatalogSource,
  ScannedTrack,
  ThemeMode,
} from '../types';

type EditField = 'title' | 'artist' | 'album' | 'album_artist' | 'track_number' | 'year' | 'genre';

interface MetadataModalProps {
  theme: ThemeMode;
  editingTrack: ScannedTrack;
  editTab: 'tags' | 'catalog';
  editTitle: string;
  editArtist: string;
  editAlbum: string;
  editAlbumArtist: string;
  editTrackNumber: string;
  editYear: string;
  editGenre: string;
  editCoverPath: string | null;
  editCoverPreviewUrl: string | null;
  removeCover: boolean;
  isSavingMetadata: boolean;
  metadataFeedback: string | null;
  catalogQuery: string;
  catalogSource: CatalogSource;
  catalogMode: 'songs' | 'albums';
  catalogResults: CatalogCandidate[];
  isSearchingCatalog: boolean;
  catalogError: string | null;
  catalogAlbums: CatalogAlbum[];
  openedAlbum: CatalogAlbum | null;
  catalogAlbumTracks: CatalogAlbumTrack[];
  isOpeningAlbum: boolean;
  albumLink: string;
  songLink: string;
  isOpeningSong: boolean;
  getCoverSrc: (coverUrl: string | null) => string;
  onClose: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSetEditTab: (tab: 'tags' | 'catalog') => void;
  onSetCatalogMode: (mode: 'songs' | 'albums') => void;
  onSetAlbumLink: (v: string) => void;
  onSearchCatalog: () => void;
  onApplyCandidate: (candidate: CatalogCandidate, applyCoverOnly: boolean) => void;
  onOpenAlbum: (album: CatalogAlbum) => void;
  onOpenAlbumByLink: (link: string) => void;
  onSetSongLink: (v: string) => void;
  onOpenSongByLink: (link: string) => void;
  onApplyAlbumTrack: (track: CatalogAlbumTrack, applyCoverOnly: boolean) => void;
  onPickCover: () => void;
  onResetField: (field: EditField) => void;
  onResetAll: () => void;
  onSave: (e: React.FormEvent) => void;
  onEditTitleChange: (v: string) => void;
  onEditArtistChange: (v: string) => void;
  onEditAlbumChange: (v: string) => void;
  onEditAlbumArtistChange: (v: string) => void;
  onEditTrackNumberChange: (v: string) => void;
  onEditYearChange: (v: string) => void;
  onEditGenreChange: (v: string) => void;
  onSetCoverPath: (v: string | null) => void;
  onSetCoverPreview: (v: string | null) => void;
  onSetRemoveCover: (v: boolean) => void;
  onCatalogQueryChange: (v: string) => void;
  onCatalogSourceChange: (v: CatalogSource) => void;
}

export default function MetadataModal({
  theme,
  editingTrack,
  editTab,
  editTitle,
  editArtist,
  editAlbum,
  editAlbumArtist,
  editTrackNumber,
  editYear,
  editGenre,
  editCoverPath,
  editCoverPreviewUrl,
  removeCover,
  isSavingMetadata,
  metadataFeedback,
  catalogQuery,
  catalogSource,
  catalogMode,
  catalogResults,
  isSearchingCatalog,
  catalogError,
  catalogAlbums,
  openedAlbum,
  catalogAlbumTracks,
  isOpeningAlbum,
  albumLink,
  songLink,
  isOpeningSong,
  getCoverSrc,
  onClose,
  onPaste,
  onSetEditTab,
  onSetCatalogMode,
  onSetAlbumLink,
  onSearchCatalog,
  onApplyCandidate,
  onOpenAlbum,
  onOpenAlbumByLink,
  onSetSongLink,
  onOpenSongByLink,
  onApplyAlbumTrack,
  onPickCover,
  onResetField,
  onResetAll,
  onSave,
  onEditTitleChange,
  onEditArtistChange,
  onEditAlbumChange,
  onEditAlbumArtistChange,
  onEditTrackNumberChange,
  onEditYearChange,
  onEditGenreChange,
  onSetCoverPath,
  onSetCoverPreview,
  onSetRemoveCover,
  onCatalogQueryChange,
  onCatalogSourceChange,
}: MetadataModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>();

  return (
    <div
      className={`theme-modal-backdrop tema-${theme} fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6`}
      onClick={() => onClose()}
      onPaste={onPaste}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Editor de metadatos"
        className={`glass-card theme-modal tema-${theme} rounded-3xl border border-white/10 w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-base`}
        onClick={(e) => e.stopPropagation()}
      >
        {theme === 'manga' && (
          <div className="manga-modal-ribbon" aria-hidden="true">
            <span>第 01 話</span>
            <strong>EDICIÓN DE METADATOS</strong>
            <small>
              SAKURA · CAPÍTULO {String(editingTrack.track_number ?? 1).padStart(2, '0')}
            </small>
          </div>
        )}

        {/* Cabecera con pestañas de navegación */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.03] gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-500/20 to-purple-500/20 border border-accent-500/30 flex items-center justify-center text-accent-400 flex-shrink-0">
              <Tags className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Editor de Metadatos & Catálogo
                <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30">
                  {editingTrack.format}
                </span>
              </h3>
              <p
                className="text-xs text-ink-400 truncate max-w-md font-mono"
                title={editingTrack.path}
              >
                {editingTrack.path.split('\\').pop() || editingTrack.path.split('/').pop()}
              </p>
            </div>
          </div>

          {/* Selector de pestañas */}
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => onSetEditTab('tags')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  editTab === 'tags'
                    ? 'bg-gradient-to-r from-accent-500 to-purple-600 text-white shadow-md'
                    : 'text-ink-400 hover:text-white'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Etiquetas & Portada</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSetEditTab('catalog');
                  if (catalogResults.length === 0 && !isSearchingCatalog) {
                    onSearchCatalog();
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  editTab === 'catalog'
                    ? 'bg-gradient-to-r from-accent-500 to-purple-600 text-white shadow-md'
                    : 'text-ink-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Buscador Catálogo</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </button>
            </div>

            <button
              onClick={() => onClose()}
              className="p-2 rounded-xl hover:bg-white/10 text-ink-400 hover:text-white transition-colors"
              aria-label="Cerrar editor de metadatos"
              title="Cerrar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra técnica de especificaciones de audio */}
        <div className="px-6 py-2 bg-black/30 border-b border-white/5 flex items-center justify-between text-xs text-ink-400 font-mono">
          <div className="flex items-center gap-4">
            <span>
              Duración: <strong className="text-ink-200">{editingTrack.duration_str}</strong>
            </span>
            <span>
              Tamaño:{' '}
              <strong className="text-ink-200">
                {(editingTrack.file_size / (1024 * 1024)).toFixed(2)} MB
              </strong>
            </span>
            {editingTrack.year && (
              <span>
                Año original: <strong className="text-ink-200">{editingTrack.year}</strong>
              </span>
            )}
            {editingTrack.track_number && (
              <span>
                Pista original:{' '}
                <strong className="text-ink-200">#{editingTrack.track_number}</strong>
              </span>
            )}
          </div>
          <div className="text-2xs text-ink-500 hidden sm:block">
            Presiona <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-ink-300">Ctrl+V</kbd>{' '}
            para pegar portada
          </div>
        </div>

        {/* PESTAÑA 1: ETIQUETAS & PORTADA */}
        {editTab === 'tags' && (
          <form onSubmit={onSave} className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Columna Izquierda: Portada Interactiva (4 cols) */}
              <div className="md:col-span-4 flex flex-col items-center gap-3">
                <div className="w-full aspect-square max-w-[240px] rounded-2xl overflow-hidden relative group border border-white/15 bg-black/40 shadow-2xl flex items-center justify-center">
                  {removeCover ? (
                    <div className="flex flex-col items-center justify-center text-rose-400 p-4 text-center">
                      <Trash2 className="w-10 h-10 mb-2 opacity-80" />
                      <span className="text-xs font-bold">Portada eliminada</span>
                      <span className="text-2xs text-ink-400 mt-1">
                        Se borrarán los frames de portada al guardar
                      </span>
                    </div>
                  ) : editCoverPreviewUrl ? (
                    <img
                      src={editCoverPreviewUrl}
                      className="w-full h-full object-cover"
                      alt="Nueva portada seleccionada"
                    />
                  ) : editCoverPath ? (
                    <img
                      src={convertFileSrc(editCoverPath)}
                      className="w-full h-full object-cover"
                      alt="Portada elegida"
                    />
                  ) : getCoverSrc(editingTrack.cover_url) ? (
                    <img
                      src={getCoverSrc(editingTrack.cover_url)}
                      className="w-full h-full object-cover"
                      alt="Portada actual"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-ink-600 p-4 text-center">
                      <Music2 className="w-14 h-14 mb-2 opacity-50" />
                      <span className="text-xs text-ink-400">Sin carátula incrustada</span>
                    </div>
                  )}

                  {/* Etiqueta sobre la portada */}
                  <div className="absolute top-2 left-2 pointer-events-none">
                    {removeCover ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/80 backdrop-blur-md text-white text-2xs font-bold">
                        Para eliminar
                      </span>
                    ) : editCoverPreviewUrl || editCoverPath ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/80 backdrop-blur-md text-white text-2xs font-bold">
                        Nueva portada lista
                      </span>
                    ) : getCoverSrc(editingTrack.cover_url) ? (
                      <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-ink-300 text-2xs">
                        Original
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Botones de acción de la portada */}
                <div className="w-full max-w-[240px] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onPickCover}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      title="Seleccionar archivo JPG, PNG o WEBP"
                    >
                      <ImagePlus className="w-3.5 h-3.5 text-accent-400" />
                      <span>Cargar...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSetEditTab('catalog');
                        if (catalogResults.length === 0) onSearchCatalog();
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-cyan-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      title="Buscar carátula HD en Apple Music"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Buscar HD</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {!removeCover &&
                      (getCoverSrc(editingTrack.cover_url) ||
                        editCoverPath ||
                        editCoverPreviewUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            onSetRemoveCover(true);
                            onSetCoverPath(null);
                            onSetCoverPreview(null);
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition-colors border border-rose-500/20 flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Quitar carátula</span>
                        </button>
                      )}

                    {(removeCover || editCoverPath || editCoverPreviewUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          onSetRemoveCover(false);
                          onSetCoverPath(null);
                          onSetCoverPreview(null);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 text-xs font-medium transition-colors border border-white/10 flex items-center justify-center gap-1"
                      >
                        <Undo2 className="w-3 h-3" />
                        <span>Restaurar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Campos de Texto (8 cols) */}
              <div className="md:col-span-8 space-y-4">
                {/* Sección: Información Principal */}
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-bold uppercase tracking-wider text-accent-400">
                      Información Principal
                    </span>
                  </div>

                  {/* Título */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-2xs font-medium text-ink-400 uppercase">
                        Título de la canción
                      </label>
                      {editTitle !== editingTrack.title && (
                        <button
                          type="button"
                          onClick={() => onResetField('title')}
                          className="text-2xs text-accent-400 hover:underline flex items-center gap-1"
                        >
                          <Undo2 className="w-2.5 h-2.5" /> Revertir
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => onEditTitleChange(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 outline-none transition-colors"
                      placeholder="Título del tema"
                    />
                  </div>

                  {/* Artista y Artista del Álbum */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-2xs font-medium text-ink-400 uppercase">
                          Artista
                        </label>
                        {editArtist !== editingTrack.artist && (
                          <button
                            type="button"
                            onClick={() => onResetField('artist')}
                            className="text-2xs text-accent-400 hover:underline flex items-center gap-1"
                          >
                            <Undo2 className="w-2.5 h-2.5" /> Revertir
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editArtist}
                        onChange={(e) => onEditArtistChange(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 outline-none transition-colors"
                        placeholder="Nombre del artista"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-2xs font-medium text-ink-400 uppercase">
                          Artista del Álbum
                        </label>
                        {editAlbumArtist !== (editingTrack.album_artist || editingTrack.artist) && (
                          <button
                            type="button"
                            onClick={() => onResetField('album_artist')}
                            className="text-2xs text-accent-400 hover:underline flex items-center gap-1"
                          >
                            <Undo2 className="w-2.5 h-2.5" /> Revertir
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editAlbumArtist}
                        onChange={(e) => onEditAlbumArtistChange(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 outline-none transition-colors"
                        placeholder="Artista del álbum"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Álbum y Pista */}
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-2xs font-bold uppercase tracking-wider text-purple-400">
                    Álbum & Posición
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-2xs font-medium text-ink-400 uppercase">Álbum</label>
                        {editAlbum !== editingTrack.album && (
                          <button
                            type="button"
                            onClick={() => onResetField('album')}
                            className="text-2xs text-accent-400 hover:underline flex items-center gap-1"
                          >
                            <Undo2 className="w-2.5 h-2.5" /> Revertir
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editAlbum}
                        onChange={(e) => onEditAlbumChange(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 outline-none transition-colors"
                        placeholder="Nombre del álbum"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-2xs font-medium text-ink-400 uppercase">
                          Pista Nº
                        </label>
                        {editTrackNumber !==
                          (editingTrack.track_number
                            ? editingTrack.track_number.toString()
                            : '') && (
                          <button
                            type="button"
                            onClick={() => onResetField('track_number')}
                            className="text-2xs text-accent-400 hover:underline flex items-center gap-1"
                          >
                            <Undo2 className="w-2.5 h-2.5" /> Revertir
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editTrackNumber}
                        onChange={(e) =>
                          onEditTrackNumberChange(e.target.value.replace(/[^0-9]/g, ''))
                        }
                        maxLength={4}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 outline-none transition-colors font-mono"
                        placeholder="Ej. 1"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Año & Género con Sugerencias Rápidas */}
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-2xs font-bold uppercase tracking-wider text-cyan-400">
                    Año & Género Musical
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-2xs font-medium text-ink-400 uppercase">Año</label>
                        {editYear !== (editingTrack.year ? editingTrack.year.toString() : '') && (
                          <button
                            type="button"
                            onClick={() => onResetField('year')}
                            className="text-2xs text-accent-400 hover:underline flex items-center gap-1"
                          >
                            <Undo2 className="w-2.5 h-2.5" /> Revertir
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editYear}
                        onChange={(e) => onEditYearChange(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={4}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 outline-none transition-colors font-mono"
                        placeholder="2024"
                      />
                    </div>

                    <div className="sm:col-span-8">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-2xs font-medium text-ink-400 uppercase">
                          Género
                        </label>
                        {editGenre !== (editingTrack.genre || '') && (
                          <button
                            type="button"
                            onClick={() => onResetField('genre')}
                            className="text-2xs text-accent-400 hover:underline flex items-center gap-1"
                          >
                            <Undo2 className="w-2.5 h-2.5" /> Revertir
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editGenre}
                        onChange={(e) => onEditGenreChange(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 outline-none transition-colors"
                        placeholder="Pop, Rock, Anime, etc."
                      />
                    </div>
                  </div>

                  {/* Píldoras de sugerencias rápidas de géneros */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'J-Pop',
                      'Anime',
                      'Rock',
                      'Pop',
                      'Lo-Fi',
                      'Electrónica',
                      'Hip-Hop',
                      'Metal',
                      'Vocaloid',
                      'Jazz',
                      'Clásica',
                    ].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => onEditGenreChange(g)}
                        className={`px-2.5 py-1 rounded-lg text-2xs font-medium transition-colors ${
                          editGenre.toLowerCase() === g.toLowerCase()
                            ? 'bg-accent-500 text-white'
                            : 'bg-white/5 text-ink-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mensajes de estado */}
            {metadataFeedback && (
              <div
                className={`text-xs px-4 py-3 rounded-2xl flex items-center gap-2 ${
                  metadataFeedback.startsWith('✓')
                    ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                {metadataFeedback.startsWith('✓') ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{metadataFeedback}</span>
              </div>
            )}
          </form>
        )}

        {/* PESTAÑA 2: BUSCADOR EN CATÁLOGOS DE INTERNET (ITUNES / DEEZER / MUSICBRAINZ) */}
        {editTab === 'catalog' && (
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Selector de plataforma + modo de búsqueda */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Plataforma */}
              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    { value: 'itunes', label: 'iTunes' },
                    { value: 'deezer', label: 'Deezer' },
                    { value: 'musicbrainz', label: 'MusicBrainz' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onCatalogSourceChange(s.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      catalogSource === s.value
                        ? 'bg-gradient-to-r from-accent-500 to-purple-600 text-white shadow-md'
                        : 'bg-white/5 text-ink-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {s.value === 'musicbrainz' ? (
                      <Disc3 className="w-3.5 h-3.5" />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Modo Canciones / Álbumes */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => onSetCatalogMode('songs')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    catalogMode === 'songs'
                      ? 'bg-gradient-to-r from-accent-500 to-purple-600 text-white shadow-md'
                      : 'text-ink-400 hover:text-white'
                  }`}
                >
                  <Music2 className="w-3.5 h-3.5" />
                  Canciones
                </button>
                <button
                  type="button"
                  onClick={() => onSetCatalogMode('albums')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    catalogMode === 'albums'
                      ? 'bg-gradient-to-r from-accent-500 to-purple-600 text-white shadow-md'
                      : 'text-ink-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Álbumes
                </button>
              </div>
            </div>

            {/* Barra de Búsqueda de Catálogo */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={catalogQuery}
                  onChange={(e) => onCatalogQueryChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearchCatalog()}
                  placeholder={
                    catalogMode === 'albums'
                      ? 'Buscar álbum (ej. Idle)...'
                      : 'Buscar por artista y título (ej. LiSA Gurenge)...'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => onSearchCatalog()}
                disabled={isSearchingCatalog || !catalogQuery.trim()}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-accent-500 to-purple-600 text-white text-xs font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0"
              >
                {isSearchingCatalog ? (
                  <>
                    <ThemedLoader theme={theme} pequeno />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Buscar</span>
                  </>
                )}
              </button>
            </div>

            {/* Explicación */}
            <p className="text-xs text-ink-400">
              {catalogMode === 'albums'
                ? `Busque álbumes en ${catalogSource === 'musicbrainz' ? 'MusicBrainz' : catalogSource === 'deezer' ? 'Deezer' : 'Apple Music / iTunes'}, ábralos y aplique la pista que corresponda a la canción en edición.`
                : `Busque canciones en ${catalogSource === 'musicbrainz' ? 'MusicBrainz' : catalogSource === 'deezer' ? 'Deezer' : 'Apple Music / iTunes'} para autocompletar título, artista, álbum, año, género, número de pista y carátula en alta definición.`}
            </p>

            {/* Pegar enlace del álbum (solo iTunes en modo Álbumes) */}
            {catalogMode === 'albums' && catalogSource === 'itunes' && !openedAlbum && (
              <div className="p-3 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-1.5 text-cyan-300 text-xs font-semibold">
                  <Link2 className="w-3.5 h-3.5" />
                  ¿No encuentra el álbum? Pegue el enlace de Apple Music / iTunes
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={albumLink}
                    onChange={(e) => onSetAlbumLink(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onOpenAlbumByLink(albumLink)}
                    placeholder="https://music.apple.com/us/album/1440833068"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenAlbumByLink(albumLink)}
                    disabled={isOpeningAlbum || !albumLink.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isOpeningAlbum ? (
                      <ThemedLoader theme={theme} pequeno />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    Cargar álbum
                  </button>
                </div>
              </div>
            )}

            {/* Pegar enlace de una canción concreta */}
            {catalogMode === 'songs' && catalogSource === 'itunes' && (
              <div className="p-3 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-1.5 text-cyan-300 text-xs font-semibold">
                  <Link2 className="w-3.5 h-3.5" />
                  ¿Tenés el enlace de la canción? Pegalo para importar sus datos
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={songLink}
                    onChange={(e) => onSetSongLink(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onOpenSongByLink(songLink)}
                    placeholder="https://music.apple.com/us/album/.../<id>?i=<id>"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => onOpenSongByLink(songLink)}
                    disabled={isOpeningSong || !songLink.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isOpeningSong ? (
                      <ThemedLoader theme={theme} pequeno />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    Cargar canción
                  </button>
                </div>
              </div>
            )}

            {/* Mensaje de error de catálogo */}
            {catalogError && (
              <div className="text-xs px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{catalogError}</span>
              </div>
            )}

            {/* ── Vista ÁLBUMES ABIERTO: sus pistas ── */}
            {openedAlbum && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSetCatalogMode('albums')}
                    className="text-xs text-accent-400 hover:underline flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Volver a álbumes
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  {openedAlbum.cover_url ? (
                    <img
                      src={openedAlbum.cover_url}
                      className="w-14 h-14 rounded-xl object-cover border border-white/10 shadow-md"
                      alt={openedAlbum.title}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-6 h-6 text-ink-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate flex items-center gap-2">
                      {openedAlbum.title}
                      <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30">
                        {openedAlbum.track_count} pistas
                      </span>
                    </h4>
                    <p className="text-xs text-ink-300 truncate">
                      {openedAlbum.artist}
                      {openedAlbum.year && (
                        <span className="text-ink-500"> • {openedAlbum.year}</span>
                      )}
                    </p>
                  </div>
                </div>

                {isOpeningAlbum ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-ink-400 text-xs">
                    <ThemedLoader theme={theme} pequeno />
                    Cargando pistas del álbum...
                  </div>
                ) : catalogAlbumTracks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5 max-h-[45vh] overflow-y-auto pr-1">
                    {catalogAlbumTracks.map((track, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-accent-500/30 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-ink-400 font-mono text-2xs flex-shrink-0">
                            {track.track_number || idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-accent-300 transition-colors">
                              {track.title}
                            </h4>
                            <p className="text-xs text-ink-300 truncate">
                              {track.artist}
                              {track.year && <span className="text-ink-500"> • {track.year}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => onApplyAlbumTrack(track, true)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5"
                            title="Importar solamente la carátula en alta resolución"
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Solo portada</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onApplyAlbumTrack(track, false)}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-accent-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Aplicar pista
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* ── Resultados: ÁLBUMES ── */}
            {!openedAlbum && catalogMode === 'albums' && catalogAlbums.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-ink-400">
                  Álbumes encontrados ({catalogAlbums.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {catalogAlbums.map((album, idx) => (
                    <div
                      key={idx}
                      onClick={() => onOpenAlbum(album)}
                      className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-accent-500/30 transition-all flex items-center gap-3 group cursor-pointer"
                    >
                      {album.cover_url ? (
                        <img
                          src={album.cover_url}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-white/10 shadow-md group-hover:scale-105 transition-transform"
                          alt={album.title}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Layers className="w-6 h-6 text-ink-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-accent-300 transition-colors flex items-center gap-2">
                          <ListMusic className="w-3.5 h-3.5 text-accent-400 flex-shrink-0" />
                          {album.title}
                        </h4>
                        <p className="text-xs text-ink-300 truncate">
                          {album.artist}
                          {album.year && <span className="text-ink-500"> • {album.year}</span>}
                        </p>
                        <div className="flex items-center gap-2 text-2xs text-ink-400 font-mono mt-0.5">
                          <span>{album.track_count} pistas</span>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-ink-500 -rotate-180 flex-shrink-0 group-hover:text-accent-300 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Resultados: CANCIONES ── */}
            {catalogMode === 'songs' && catalogResults.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-ink-400">
                  Resultados encontrados ({catalogResults.length})
                </span>

                <div className="grid grid-cols-1 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {catalogResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-accent-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.cover_url ? (
                          <img
                            src={item.cover_url}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-white/10 shadow-md group-hover:scale-105 transition-transform"
                            alt={item.title}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                            <Music2 className="w-5 h-5 text-ink-500" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-accent-300 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-ink-300 truncate">
                            {item.artist} <span className="text-ink-500">•</span> {item.album}
                          </p>
                          <div className="flex items-center gap-2 text-2xs text-ink-400 font-mono mt-0.5">
                            {item.year && <span>{item.year}</span>}
                            {item.genre && <span>• {item.genre}</span>}
                            {item.track_number && <span>• Pista #{item.track_number}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Botones de Importación */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        {item.cover_url && (
                          <button
                            type="button"
                            onClick={() => onApplyCandidate(item, true)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5"
                            title="Importar solamente la carátula en alta resolución"
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Solo portada</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onApplyCandidate(item, false)}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-accent-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Aplicar todo</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pie con los botones de acción */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetAll}
              className="px-3 py-2 rounded-xl text-xs text-ink-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Restablecer valores originales</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onClose()}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-ink-300 hover:bg-white/10 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={isSavingMetadata}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-500 via-accent-600 to-purple-600 text-white text-xs font-bold shadow-xl hover:shadow-accent-500/25 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingMetadata ? (
                <>
                  <ThemedLoader theme={theme} pequeno />
                  <span>Guardando en archivo...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
