import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Evita que un fallo de render deje la ventana en blanco. Muestra un mensaje
 * en español y deja al usuario recargar sin perder la biblioteca (está en
 * SQLite, no en memoria).
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error al dibujar la interfaz:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#fbf7f4] px-6 text-center"
        role="alert"
      >
        <span className="text-4xl" aria-hidden="true">
          🌸
        </span>
        <h1 className="text-lg font-bold text-[#2b1521]">La interfaz encontró un problema</h1>
        <p className="max-w-md text-sm text-[#8a6577]">
          Su biblioteca y sus descargas están a salvo. Recargue la app para volver a intentarlo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
        >
          Recargar Sakura Music
        </button>
        <details className="mt-2 max-w-md text-left text-xs text-[#8a6577]">
          <summary className="cursor-pointer">Detalle técnico</summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap">{error.message}</pre>
        </details>
      </div>
    );
  }
}
