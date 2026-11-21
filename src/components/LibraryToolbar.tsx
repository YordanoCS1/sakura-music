import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  Disc3,
  FolderOpen,
  FolderTree,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  RotateCw,
  Sparkles,
  Trash2,
  ChevronDown,
  Check,
} from 'lucide-react';
import type { ViewMode } from '../types';

interface LibraryToolbarProps {
  currentFolder: string | null;
  isScanning: boolean;
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

const VIEW_GROUPS: {
  label: string;
  items: { id: ViewMode; label: string; desc: string; icon: typeof Disc3 }[];
}[] = [
  {
    label: 'Clásicas',
    items: [
      { id: 'folders', label: 'Carpetas', desc: 'Explorar por ubicación', icon: FolderTree },
      { id: 'grid', label: 'Cuadrícula', desc: 'Portadas en rejilla', icon: LayoutGrid },
      { id: 'table', label: 'Lista', desc: 'Tabla detallada', icon: List },
      { id: 'albums', label: 'Álbumes', desc: 'Agrupado por álbum', icon: Disc3 },
      { id: 'mosaic', label: 'Pared', desc: 'Mosaico visual', icon: Layers },
    ],
  },
  {
    label: 'Visuales',
    items: [
      { id: 'cds', label: 'CDs', desc: 'Portadas circulares', icon: Disc3 },
      { id: 'tilt', label: '3D', desc: 'Tarjetas con profundidad', icon: Layers },
      { id: 'glow', label: 'Luz', desc: 'Brillo y reflejos', icon: Sparkles },
      { id: 'portadas', label: 'Portadas', desc: 'Álbumes luminosos', icon: Disc3 },
    ],
  },
];

const ALL_VIEWS = VIEW_GROUPS.flatMap((g) => g.items);

export default function LibraryToolbar({
  currentFolder,
  isScanning,
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = ALL_VIEWS.find((v) => v.id === viewMode) ?? ALL_VIEWS[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = (id: ViewMode) => {
    onSetViewMode(id);
    if (id === 'albums') onClearExpandedAlbum();
    setOpen(false);
    triggerRef.current?.focus();
  };

  // El menú se maneja con teclado igual que un selector nativo: Escape cierra
  // y las flechas recorren las opciones sin salir del componente.
  const alNavegarMenu = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const opciones = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [],
    );
    if (opciones.length === 0) return;
    const actual = opciones.indexOf(document.activeElement as HTMLButtonElement);
    const siguiente =
      event.key === 'ArrowDown'
        ? (actual + 1) % opciones.length
        : (actual - 1 + opciones.length) % opciones.length;
    opciones[siguiente].focus();
  };

  return (
    <div className="lt-dock">
      <div className="lt-bar">
        {/* Título */}
        <div className="lt-heading">
          <h2>Biblioteca</h2>
          <p title={currentFolder || undefined}>
            {isScanning ? (
              <span className="lt-scanning">
                <Loader2 className="w-3 h-3 animate-spin" /> Escaneando…
              </span>
            ) : (
              currentFolder || `${filteredCount} canciones en su colección`
            )}
          </p>
        </div>

        {/* Selector de vista (dropdown) */}
        <div className="lt-view-select" ref={ref}>
          <button
            ref={triggerRef}
            type="button"
            className={`lt-view-trigger ${open ? 'is-open' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls="lt-view-menu"
          >
            <CurrentIcon className="w-4 h-4" />
            <span>{current.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 lt-chevron ${open ? 'is-open' : ''}`} />
          </button>
          {open && (
            <div
              id="lt-view-menu"
              className="lt-view-menu"
              role="menu"
              aria-label="Vistas de biblioteca"
              ref={menuRef}
              onKeyDown={alNavegarMenu}
            >
              {VIEW_GROUPS.map((group) => (
                <div key={group.label} className="lt-view-group">
                  <div className="lt-view-group-label">{group.label}</div>
                  {group.items.map(({ id, label, desc, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={viewMode === id}
                      onClick={() => choose(id)}
                      className={`lt-view-option ${viewMode === id ? 'is-active' : ''}`}
                    >
                      <span className="lt-view-option-icon">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="lt-view-option-copy">
                        <strong>{label}</strong>
                        <small>{desc}</small>
                      </span>
                      {viewMode === id && <Check className="w-4 h-4 lt-view-check" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="lt-actions">
          {currentFolder && (
            <button
              onClick={() => onScanFolder(currentFolder)}
              disabled={isScanning || isDeleting}
              className="lt-icon-btn"
              aria-label="Volver a escanear la carpeta"
              title="Volver a escanear la carpeta"
            >
              <RotateCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={onOpenFolderDialog}
            disabled={isScanning || isDeleting}
            className="lt-folder-btn"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Carpeta</span>
          </button>
        </div>
      </div>

      {/* Barra de selección */}
      {selectedCount > 0 && (
        <div className={`lt-selection ${''}`}>
          <div className="lt-selection-info">
            <span className="lt-selection-icon">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <p>
                <strong>{selectedCount}</strong> de {filteredCount} canciones seleccionadas
              </p>
              <small>Edición en lote: álbum, artista, año, género o portada</small>
            </div>
          </div>
          <div className="lt-selection-actions">
            <button onClick={onSelectAllFiltered} className="lt-sel-secondary">
              Todas
            </button>
            <button onClick={onClearSelection} className="lt-sel-secondary">
              Limpiar
            </button>
            <button onClick={onOpenBatchModal} className="lt-sel-primary">
              <Pencil className="w-3.5 h-3.5" /> Editar ({selectedCount})
            </button>
            <button
              onClick={onDeleteSelected}
              disabled={isDeleting || isScanning}
              className="lt-sel-delete"
              title="Borrar del disco"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
