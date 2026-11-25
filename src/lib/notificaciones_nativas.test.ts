// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  onAction: vi.fn(async () => () => undefined),
  registerActionTypes: vi.fn(async () => undefined),
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => 'granted'),
  sendNotification: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-notification', () => ({
  onAction: mocks.onAction,
  registerActionTypes: mocks.registerActionTypes,
  isPermissionGranted: mocks.isPermissionGranted,
  requestPermission: mocks.requestPermission,
  sendNotification: mocks.sendNotification,
}));

import { configurarNotificaciones, notificarDescarga } from './notificaciones_nativas';

describe('notificaciones nativas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra la acción «Ver biblioteca»', async () => {
    await configurarNotificaciones(() => undefined);
    expect(mocks.onAction).toHaveBeenCalled();
    expect(mocks.registerActionTypes).toHaveBeenCalledWith([
      { id: 'sakura-descarga', actions: [{ id: 'ver-biblioteca', title: 'Ver biblioteca' }] },
    ]);
  });

  it('envía la descarga con carátula y acción', async () => {
    await notificarDescarga('Gurenge', 'LiSA', 'D:\\covers\\abc.png');
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Descarga completada',
        body: 'Gurenge — LiSA',
        icon: 'D:\\covers\\abc.png',
        actionTypeId: 'sakura-descarga',
      }),
    );
  });
});
