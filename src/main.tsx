import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Oculta el splash de index.html. Si el navegador soporta View Transitions,
// el glifo del splash "vuela" hasta el logo de la nav en un solo movimiento.
const splash = document.getElementById('sakura-splash');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const minSplashMs = reduceMotion ? 250 : 1100;
const startedAt = performance.now();

function dismissSplash() {
  if (!splash) return;

  const finalizar = () => {
    splash.remove();
    document.documentElement.classList.remove('splash-handoff');
  };

  const conTransiciones = typeof document.startViewTransition === 'function' && !reduceMotion;

  if (!conTransiciones) {
    splash.classList.add('is-hidden');
    window.setTimeout(finalizar, reduceMotion ? 200 : 500);
    return;
  }

  try {
    const transicion = document.startViewTransition(() => {
      splash.remove();
      // En el estado "nuevo", el receptor del glifo es el logo de la nav.
      document.documentElement.classList.add('splash-handoff');
    });
    void transicion.finished.finally(() => {
      document.documentElement.classList.remove('splash-handoff');
    });
  } catch {
    // Si falla (p. ej. nombre duplicado), caemos al fundido simple.
    splash.classList.add('is-hidden');
    window.setTimeout(finalizar, 500);
  }
}

const wait = Math.max(0, minSplashMs - (performance.now() - startedAt));
window.setTimeout(dismissSplash, wait);
