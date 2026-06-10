const { Tray, Menu, nativeImage, app } = require('electron');
const logger = require('./logger');

let tray = null;

function createTray(mainWindow) {
  const iconData = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAABAAAAAQBPJcTWAAABM0lEQVR4nNVSsUoDQRSc9/YltxeVsxACYqMgSgoRSxu7dP6Cf2DnZ9jaiL0IgrVaBMRCLIKNhY1gpxANV4SgXG5lb0OyiXdyYOU0O7zdeTtvdmmxtmE0EUJiaNiVoC23NTjuagSNMc9WMCTKDjiBE3m8RFOJWA2L3kYmKtdInIOh2Gs0pwNUkxRBan51JxGpH3NZvrrVGKw1twfof6J7/6i6tw9q2p2FzDPnBjRLjOeTi4p5+6CV3Z3EjEZiMMYQO0JeQDNECEgBpFADIWWGgrvVh9gQpwOqry+nmwd7X0/7h1qJQDOjnyP2HNBEQAtLdWM6MYVxjxo3x733s+tKrtofIfQCSlpt9dJqK3vg9ei8Gl/dSXEDnvwHfkAWndPLwttHDkKi3IDKQOxz/QWFs/2fBt+R4jqe45jGJgAAAABJRU5ErkJggg==',
    'base64'
  );
  const icon = nativeImage.createFromBuffer(iconData);

  tray = new Tray(icon);
  tray.setToolTip('Sakura Music');

  const updateMenu = (isPlaying) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Mostrar/Ocultar',
        click: () => { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show(); },
      },
      { type: 'separator' },
      {
        label: isPlaying ? 'Pausar' : 'Reanudar',
        click: () => mainWindow.webContents.send('tray-play-pause'),
      },
      {
        label: 'Siguiente',
        click: () => mainWindow.webContents.send('tray-next'),
      },
      {
        label: 'Anterior',
        click: () => mainWindow.webContents.send('tray-previous'),
      },
      { type: 'separator' },
      {
        label: 'Abrir Descargas',
        click: () => { mainWindow.show(); mainWindow.webContents.send('navigate', 'queue'); },
      },
      { type: 'separator' },
      {
        label: 'Salir',
        click: () => { app.isQuitting = true; app.quit(); },
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateMenu(false);

  mainWindow.on('show', () => tray.setHighlightMode('always'));
  mainWindow.on('hide', () => tray.setHighlightMode('selection'));

  return { updateMenu, tray };
}

function destroyTray() {
  if (tray) { tray.destroy(); tray = null; }
}

module.exports = { createTray, destroyTray };
