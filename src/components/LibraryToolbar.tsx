import { Disc3, FolderOpen, FolderTree, Layers, LayoutGrid, List, Loader2, Pencil, RotateCw, Trash2 } from 'lucide-react';
import type { ViewMode } from '../types';

interface LibraryToolbarProps {
  currentFolder: string | null;
  isScanning: boolean;
  isWWM: boolean;
  viewMode: ViewMode;
  selectedCount: number;
  filteredCount: number;
  isDeleting: boolean;
  onOpenFolderDialog: () => void;
  onScanFolder: (folderPath: string) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onClearExpandedAlbum: () => void;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  onOpenBatchModal: () => void;
  onDeleteSelected: () => void;
}

export default function LibraryToolbar({
  currentFolder,
  isScanning,
  isWWM,
  viewMode,
  selectedCount,
  filteredCount,
  isDeleting,
  onOpenFolderDialog,
  onScanFolder,
  onSetViewMode,
  onClearExpandedAlbum,
  onSelectAllFiltered,
  onClearSelection,
  onOpenBatchModal,
  onDeleteSelected,
}: LibraryToolbarProps) {
  const viewModes: { id: ViewMode; label: string; icon: typeof FolderTree }[] = [
    { id: 'folders', label: 'Carpetas', icon: FolderTree },
    { id: 'grid', label: 'Cuadrícula', icon: LayoutGrid },
    { id: 'table', label: 'Lista', icon: List },
    { id: 'albums', label: 'Álbumes', icon: Disc3 },
    { id: 'mosaic', label: 'Pared', icon: LayoutGrid },
  ];

  return (
    <div className="library-toolbar-dock">
      <div className="library-toolbar">
        <div className="library-toolbar-main">
          <div className="library-toolbar-heading">
            <h2>
              Biblioteca
              {isScanning && <span className="library-scanning">Escaneando…</span>}
            </h2>
            <p title={currentFolder || undefined}>
              {currentFolder || 'Tu colección musical'}
            </p>
          </div>
          <div className="library-toolbar-actions">
          <button
            onClick={onOpenFolderDialog}
            disabled={isScanning || isDeleting}
            className="library-folder-button">
            <FolderOpen className="h-4 w-4" />
            <span>Carpeta</span>
          </button>

          {currentFolder && (
            <button
              onClick={() => onScanFolder(currentFolder)}
              disabled={isScanning || isDeleting}
              className="library-refresh-button"
              title="Volver a escanear la carpeta actual"
              aria-label="Volver a escanear la carpeta actual">
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            </button>
          )}
          </div>
        </div>

        <nav className="library-view-switcher custom-scroll" role="group" aria-label="Vista de biblioteca">
          {viewModes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onSetViewMode(id);
                if (id === 'albums') onClearExpandedAlbum();
              }}
              aria-pressed={viewMode === id}
              className={`library-view-button ${viewMode === id ? 'is-active' : ''}`}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      {selectedCount > 0 && (
        <div className={`library-selection-bar ${isWWM ? 'is-wwm' : ''}`}>
          <div className="library-selection-info">
            <div className="library-selection-icon">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="library-selection-title">
                {selectedCount} de {filteredCount} canciones seleccionadas
              </p>
              <p className="library-selection-hint">
                Edición en lote: aplica álbum, artista, año, género o portada compartida
              </p>
            </div>
          </div>

          <div className="library-selection-actions">
            <button
              onClick={onSelectAllFiltered}
              className="library-selection-secondary">
              Seleccionar Todas
            </button>
            <button
              onClick={onClearSelection}
              className="library-selection-secondary">
              Deseleccionar
            </button>
            <button
              onClick={onOpenBatchModal}
              className="library-selection-primary">
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar en Lote ({selectedCount})</span>
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={isDeleting || isScanning}
              className="library-selection-delete"
              title="Borrar permanentemente del disco">
              {isDeleting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isDeleting ? 'Eliminando…' : `Eliminar (${selectedCount})`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
