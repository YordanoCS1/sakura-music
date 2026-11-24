// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertFileSrc, esEscritorio, invoke } from './puente';

describe('puente en modo celular', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('MODE', 'development');
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('detecta que no es el escritorio', () => {
    expect(esEscritorio()).toBe(false);
  });

  it('envía los comandos por HTTP', async () => {
    const resultado = await invoke('list_playlists', { id: '1' });
    expect(resultado).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cmd/list_playlists',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id: '1' }),
      }),
    );
  });

  it('convierte rutas locales en URLs del servidor', () => {
    expect(convertFileSrc('D:\\Música\\portada.jpg')).toBe(
      '/api/archivo?path=D%3A%5CM%C3%BAsica%5Cportada.jpg',
    );
  });

  it('muestra el error del servidor', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'falló el comando' }),
    });
    await expect(invoke('start_download')).rejects.toThrow('falló el comando');
  });
});
