import { FileItem, SongMetadata } from '../../pages/LibraryTypes';

export interface LibraryLayoutProps {
  files: FileItem[];
  filteredFiles: FileItem[];
  currentPath: string;
  breadcrumbs: { name: string; path: string }[];
  libraryRoot: string;
  searchQuery: string;
  selectedFiles: Set<string>;
  selectedFile: FileItem | null;
  loading: boolean;
  stats: { totalFiles: number; folders: number; totalSize: string };
  getMeta: (path: string) => SongMetadata | null;
  formatDuration: (seconds: number | null) => string;
  formatSize: (bytes: number) => string;
  numeral: (n: number) => string;
  navigate: (path: string) => void;
  navigateToRoot: () => void;
  onFileClick: (file: FileItem, isDir: boolean) => void;
  onFileContextMenu?: (file: FileItem, e: React.MouseEvent) => void;
  onSelect: (path: string, shift: boolean) => void;
  clearSelection: () => void;
  onDeleteFiles: (paths: string[]) => void;
  onOpenInfo: (file: FileItem) => void;
  onOpenEditor: (file: FileItem) => void;
  searchInput: string;
  onSearchChange: (val: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
  filterType: string;
  onFilterChange: (val: string) => void;
  hoveredCard: string | null;
  onHover: (path: string | null) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  setSelectedFile: (f: FileItem | null) => void;
  loadPath: (p?: string) => void;
  setInfoPanelFile: React.Dispatch<React.SetStateAction<FileItem | null>>;
  setMetadataEditorFile: React.Dispatch<React.SetStateAction<FileItem | null>>;
}

export type LibraryLayout = 'glass' | 'list-minimal' | 'masonry' | 'split' | 'carousel' | 'mosaic' | 'feed' | 'index' | 'frame' | 'citypop' | 'tokyo-neon' | 'kawaii' | 'visual-kei' | 'zen-garden' | 'retrowave' | 'anime-op' | 'yokai' | 'ciudad-prohibida' | 'erudito' | 'porcelana' | 'dragon' | 'festival' | 'jade';

export const LAYOUT_NAMES: Record<LibraryLayout, { name: string; desc: string }> = {
  'glass': { name: 'Glassmorphism Oscuro', desc: 'Cristal oscuro con cuadrícula de portadas' },
  'list-minimal': { name: 'Lista Minimalista', desc: 'Tabla limpia con columnas ordenables' },
  'masonry': { name: 'Masonry Grid', desc: 'Cuadrícula escalonada tipo Pinterest' },
  'split': { name: 'Vista Dividida', desc: 'Panel triple profesional' },
  'carousel': { name: 'Carrusel', desc: 'Cover-flow horizontal con foco central' },
  'mosaic': { name: 'Mosaico', desc: 'Cuadrícula con tamaños variables tipo patchwork' },
  'feed': { name: 'Feed', desc: 'Una columna vertical tipo playlist' },
  'index': { name: 'Índice A-Z', desc: 'Agrupación alfabética tipo agenda' },
  'frame': { name: 'Galería', desc: 'Marcos de cuadro con paginación' },
  'citypop': { name: 'City Pop', desc: 'Estética retro 80s japonesa con degradados atardecer' },
  'tokyo-neon': { name: 'Tokyo Neon', desc: 'Noche de Shibuya con bordes neón y fondo oscuro' },
  'kawaii': { name: 'Kawaii Dream', desc: 'Nubes y estrellas flotantes con vibras pastel soñadoras' },
  'visual-kei': { name: 'Visual Kei', desc: 'Gótico victoriano con dorado vibrante y bordes carmesí' },
  'zen-garden': { name: 'Zen Garden', desc: 'Jardín japonés karesansui con rollos colgantes kakemono' },
  'retrowave': { name: 'Retro Wave', desc: 'Vaporwave con neón púrpura/rosa y rejilla retro' },
  'anime-op': { name: 'Anime OP', desc: 'Paneles de manga con líneas de velocidad y estallidos' },
  'yokai': { name: 'Yōkai', desc: 'Folclore japonés nocturno con linternas fantasma' },
  'ciudad-prohibida': { name: 'Ciudad Prohibida', desc: 'Palacio imperial chino con abanicos de seda' },
  'erudito': { name: 'Erudito', desc: 'Caligrafía china con pergaminos de tinta y bambú' },
  'porcelana': { name: 'Porcelana Azul', desc: 'Cerámica Ming azul y blanca con jarrones' },
  'dragon': { name: 'Dragón Celestial', desc: 'Mito chino con nubes doradas y perlas de jade' },
  'festival': { name: 'Festival', desc: 'Linternas rojas colgantes con borlas doradas' },
  'jade': { name: 'Jade', desc: 'Jade verde tallado con adornos dorados' },
};
