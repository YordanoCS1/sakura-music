import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';

interface ActionToastProps {
  mensaje: string;
  accion?: { etiqueta: string; onClick: () => void };
  onDismiss: () => void;
  duracion?: number;
}

/** Aviso con una acción opcional: ver en biblioteca, reintentar, etc. */
export default function ActionToast({
  mensaje,
  accion,
  onDismiss,
  duracion = 6000,
}: ActionToastProps) {
  useEffect(() => {
    const temporizador = window.setTimeout(onDismiss, duracion);
    return () => window.clearTimeout(temporizador);
  }, [onDismiss, duracion, mensaje]);

  return createPortal(
    <div className="action-toast" role="status" aria-live="polite">
      <span className="action-toast-icon" aria-hidden="true">
        <Check className="w-4 h-4" />
      </span>
      <span className="action-toast-copy" title={mensaje}>
        {mensaje}
      </span>
      {accion && (
        <button type="button" className="action-toast-btn" onClick={accion.onClick}>
          {accion.etiqueta}
        </button>
      )}
      <button type="button" className="action-toast-close" onClick={onDismiss} aria-label="Cerrar">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>,
    document.body,
  );
}
