import { useCallback } from 'react';
import type { AppTab, ThemeMode } from '../types';

type SetTab = (tab: AppTab) => void;

/**
 * Devuelve un setter de pestañas que dispara una transición visual acorde al
 * tema activo. Usa la View Transitions API cuando está disponible y cae a una
 * animación CSS simple en navegadores que no la soportan.
 */
export function useThemeTransition(tema: ThemeMode, setTab: SetTab): SetTab {
  return useCallback(
    (tab: AppTab) => {
      const documento = document;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduceMotion) {
        setTab(tab);
        return;
      }

      documento.documentElement.dataset['themeTransition'] = tema;

      if (typeof documento.startViewTransition === 'function') {
        documento.startViewTransition(() => setTab(tab));
        return;
      }

      const panel = document.getElementById('theme-panel');
      if (panel) {
        panel.classList.remove('panel-enter');
        // Forzar reflow para reiniciar la animación de entrada.
        void panel.offsetWidth;
        panel.classList.add('panel-enter');
      }
      setTab(tab);
    },
    [tema, setTab],
  );
}
