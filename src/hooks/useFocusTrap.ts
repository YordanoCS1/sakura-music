import { useEffect, useRef } from 'react';

const SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Mantiene el foco dentro de un diálogo mientras está abierto y lo devuelve
 * al control que lo abrió al cerrarse. Sin esto, Tab se escapa al fondo y un
 * usuario de teclado pierde el contexto del modal.
 */
export function useFocusTrap<T extends HTMLElement>(activo = true, enfocarAlAbrir = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!activo || !ref.current) return;
    const nodo = ref.current;
    const anterior = document.activeElement as HTMLElement | null;

    const enfocables = () =>
      Array.from(nodo.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (elemento) => elemento.offsetParent !== null,
      );

    if (enfocarAlAbrir) enfocables()[0]?.focus();

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Tab') return;
      const elementos = enfocables();
      if (elementos.length === 0) return;
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    nodo.addEventListener('keydown', alPulsar);
    return () => {
      nodo.removeEventListener('keydown', alPulsar);
      anterior?.focus();
    };
  }, [activo, enfocarAlAbrir]);

  return ref;
}
