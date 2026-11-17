import type { ReactNode } from 'react';
import { DownloadCloud, Flower2, Search } from 'lucide-react';

interface EmptyStateProps {
  titulo: string;
  descripcion: string;
  variante?: 'sakura' | 'descarga' | 'busqueda';
  accion?: ReactNode;
}

const ICONOS = {
  sakura: Flower2,
  descarga: DownloadCloud,
  busqueda: Search,
};

/**
 * Estado vacío con la identidad M3 Zen: una sola marca, jerarquía clara y una
 * acción concreta. Reemplaza los carteles sueltos que no invitaban a hacer nada.
 */
export default function EmptyState({
  titulo,
  descripcion,
  variante = 'sakura',
  accion,
}: EmptyStateProps) {
  const Icono = ICONOS[variante];

  return (
    <div className="glass-card my-6 flex flex-col items-center justify-center rounded-3xl border border-white/5 p-12 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-accent-500/20 bg-accent-500/10 text-accent-300">
        <Icono className="h-8 w-8" strokeWidth={1.4} aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-base font-bold text-white">{titulo}</h3>
      <p className="mb-6 max-w-sm text-2xs leading-relaxed text-ink-300">{descripcion}</p>
      {accion}
    </div>
  );
}
