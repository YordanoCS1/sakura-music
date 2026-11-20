import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Undo2, X } from 'lucide-react';

interface UndoToastProps {
  count: number;
  onUndo: () => void;
  onDismiss: () => void;
}

/** Aviso de borrado con opción de deshacer durante unos segundos. */
export default function UndoToast({ count, onUndo, onDismiss }: UndoToastProps) {
  useEffect(() => {
    const temporizador = window.setTimeout(onDismiss, 9_000);
    return () => window.clearTimeout(temporizador);
  }, [onDismiss]);

  return createPortal(
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-toast-icon" aria-hidden="true">
        <Undo2 className="w-4 h-4" />
      </span>
      <span className="undo-toast-copy">
        <strong>{count === 1 ? 'Pista eliminada' : `${count} pistas eliminadas`}</strong>
        <small>Se guardaron en la papelera.</small>
      </span>
      <button type="button" className="undo-toast-btn" onClick={onUndo}>
        Deshacer
      </button>
      <button
        type="button"
        className="undo-toast-close"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>,
    document.body,
  );
}
