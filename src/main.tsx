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

// Oculta el splash de index.html. La animación de entrada la hace CSS, así
// que no hace falta añadir clases al body desde JavaScript.
const splash = document.getElementById('sakura-splash');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const minSplashMs = reduceMotion ? 250 : 1100;
const startedAt = performance.now();

function dismissSplash() {
  if (splash) {
    splash.classList.add('is-hidden');
    window.setTimeout(() => splash.remove(), reduceMotion ? 200 : 500);
  }
}

const wait = Math.max(0, minSplashMs - (performance.now() - startedAt));
window.setTimeout(dismissSplash, wait);
