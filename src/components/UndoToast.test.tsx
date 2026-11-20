// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UndoToast from './UndoToast';

describe('aviso de borrado con deshacer', () => {
  it('muestra el contador y permite deshacer', () => {
    const alDeshacer = vi.fn();
    render(<UndoToast count={3} onUndo={alDeshacer} onDismiss={vi.fn()} />);
    expect(screen.getByText('3 pistas eliminadas')).toBeTruthy();
    screen.getByRole('button', { name: 'Deshacer' }).click();
    expect(alDeshacer).toHaveBeenCalledOnce();
  });

  it('usa singular para una sola pista', () => {
    render(<UndoToast count={1} onUndo={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Pista eliminada')).toBeTruthy();
  });
});
