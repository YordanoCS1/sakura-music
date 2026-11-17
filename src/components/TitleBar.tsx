import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Maximize2, Minus, Minimize2, X } from 'lucide-react';

// Barra de título personalizada de la ventana (la nativa de Windows se ocultó
// con `decorations: false` en Rust). Toda la barra es zona de arrastre salvo
// los botones; los pétalos y el fondo la integran con el tema M3 Zen.
export default function TitleBar() {
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    let disposed = false;
    (async () => {
      try {
        if (!disposed) setIsMax(await win.isMaximized());
      } catch {
        /* ventana no disponible (p. ej. en tests) */
      }
    })();
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setIsMax).catch(() => {});
    });
    return () => {
      disposed = true;
      unlisten.then((fn) => fn?.()).catch(() => {});
    };
  }, []);

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand" data-tauri-drag-region>
        <span className="titlebar-brand-mark" aria-hidden="true" data-tauri-drag-region>桜</span>
        <span className="titlebar-brand-name" data-tauri-drag-region>Sakura Music</span>
        <span className="titlebar-brand-tag" data-tauri-drag-region>M3 Zen</span>
      </div>

      <div className="titlebar-actions">
        <button
          type="button"
          className="titlebar-btn"
          onClick={() => getCurrentWindow().minimize()}
          aria-label="Minimizar"
          title="Minimizar">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          onClick={() => getCurrentWindow().toggleMaximize()}
          aria-label={isMax ? 'Restaurar' : 'Maximizar'}
          title={isMax ? 'Restaurar' : 'Maximizar'}>
          {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-btn-close"
          onClick={() => getCurrentWindow().close()}
          aria-label="Cerrar"
          title="Cerrar">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}