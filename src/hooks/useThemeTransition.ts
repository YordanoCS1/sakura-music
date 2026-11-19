import { useCallback, useRef } from 'react';
import type { AppTab, ThemeMode } from '../types';

type SetTab = (tab: AppTab) => void;

/**
 * Cambia de pestaña aplicando una animación ligera al panel. Se anima el
 * elemento real (no un snapshot de toda la página como View Transitions),
 * usando sólo transform/opacity para que el navegador lo haga en el GPU.
 */
export function useThemeTransition(tema: ThemeMode, setTab: SetTab): SetTab {
  const animando = useRef(false);

  return useCallback(
    (tab: AppTab) => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const panel = document.getElementById('theme-panel');

      document.documentElement.dataset['themeTransition'] = tema;

      if (reduceMotion || !panel || animando.current) {
        setTab(tab);
        return;
      }

      animando.current = true;
      // Reiniciamos la animación aunque la pestaña no cambie.
      panel.classList.remove('panel-enter');
      void panel.offsetWidth;
      panel.classList.add('panel-enter');
      setTab(tab);

      window.setTimeout(() => {
        panel.classList.remove('panel-enter');
        animando.current = false;
      }, 240);
    },
    [tema, setTab],
  );
}
