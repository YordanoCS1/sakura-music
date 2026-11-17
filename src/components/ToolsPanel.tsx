import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Check, Download, Loader2 } from 'lucide-react';
import type { ToolProgress, ToolStatus } from '../types';

/**
 * Panel de Ajustes que instala yt-dlp y FFmpeg cuando no están en el sistema.
 * Sólo escribe en `bin/`: nunca pisa un binario que el usuario ya tiene.
 */
export default function ToolsPanel() {
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [progresos, setProgresos] = useState<Record<string, ToolProgress>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelar: (() => void) | undefined;
    invoke<ToolStatus[]>('tools_status')
      .then(setTools)
      .catch((e) => setError(String(e)));
    listen<ToolProgress>('tools-download-progress', (evento) => {
      setProgresos((actual) => ({ ...actual, [evento.payload.tool]: evento.payload }));
    }).then((fn) => {
      cancelar = fn;
    });
    return () => cancelar?.();
  }, []);

  const instalar = async (id: ToolStatus['id']) => {
    setError(null);
    try {
      const estado = await invoke<ToolStatus>('install_downloader_tools', { tool: id });
      setTools((actual) =>
        actual.map((herramienta) => (herramienta.id === estado.id ? estado : herramienta)),
      );
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <section className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-accent-400" />
        <h3 className="text-xs font-bold text-white">Herramientas de descarga</h3>
      </div>

      <p className="text-xs text-ink-500">
        yt-dlp y FFmpeg se usan para buscar y convertir música. Si ya están en tu sistema, Sakura
        las detecta y no las reemplaza.
      </p>

      {tools.map((tool) => {
        const progreso = progresos[tool.id];
        const descargando = progreso && progreso.estado === 'descargando';
        const porcentaje =
          progreso && progreso.total > 0
            ? Math.min(100, Math.round((progreso.descargado / progreso.total) * 100))
            : 0;

        return (
          <div
            key={tool.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                {tool.instalada ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                {tool.nombre}
              </div>
              <div className="truncate text-2xs text-ink-500" title={tool.ruta ?? undefined}>
                {tool.instalada
                  ? tool.en_bin
                    ? 'Instalada por Sakura'
                    : `Detectada: ${tool.ruta ?? 'sistema'}`
                  : `Versión disponible: ${tool.version}`}
              </div>
              {descargando && (
                <div
                  className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={porcentaje}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Descargando ${tool.nombre}`}
                >
                  <div
                    className="h-full bg-accent-500 transition-all"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              )}
            </div>

            {!tool.instalada && (
              <button
                type="button"
                onClick={() => instalar(tool.id)}
                disabled={!!descargando}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                {descargando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {descargando ? `${porcentaje}%` : 'Instalar'}
              </button>
            )}
          </div>
        );
      })}

      {error && (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
