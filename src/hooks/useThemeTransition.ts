import { useCallback, useRef } from 'react';
import type { AppTab, ThemeMode } from '../types';

type SetTab = (tab: AppTab) => void;

/**
 * Cambia de pestaña aplicando una animación ligera al panel. Se anima el
 * elemento real (no un snapshot de toda la página como View Transitions),
 * usando sólo transform/opacity para que el navegador lo haga en el GPU.
 */
export function useThemeTransition(tema: ThemeMode, setTab: SetTab): SetTab {
  const temporizador = useRef<number | undefined>(undefined);

  return useCallback(
    (tab: AppTab) => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const panel = document.getElementById('theme-panel');

      document.documentElement.dataset['themeTransition'] = tema;

      if (reduceMotion || !panel) {
        setTab(tab);
        return;
      }

      // Reiniciamos la animación aunque la pestaña no cambie. No bloqueamos
      // los cambios rápidos: cada clic Reinicia su propia animación corta.
      panel.classList.remove('panel-enter');
      void panel.offsetWidth;
      panel.classList.add('panel-enter');
      setTab(tab);

      window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => {
        panel.classList.remove('panel-enter');
      }, 200);
    },
    [tema, setTab],
  );
}
