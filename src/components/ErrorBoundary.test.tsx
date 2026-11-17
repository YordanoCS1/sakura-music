// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

function ComponenteQueFalla(): never {
  throw new Error('fallo controlado de prueba');
}

afterEach(() => cleanup());

describe('ErrorBoundary', () => {
  it('muestra un mensaje y la acción de recargar cuando un hijo falla', () => {
    // React imprime el error capturado; en el test lo silenciamos.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ComponenteQueFalla />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('La interfaz encontró un problema')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recargar Sakura Music' })).toBeTruthy();
    expect(screen.getByText('fallo controlado de prueba')).toBeTruthy();

    spy.mockRestore();
  });

  it('deja pasar a los hijos cuando no hay errores', () => {
    render(
      <ErrorBoundary>
        <p>Contenido normal</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Contenido normal')).toBeTruthy();
  });
});
