const { app, BrowserWindow, ipcMain, shell, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { getCover } = require('./covers');
const taskbarProgress = require('./taskbar-progress');
const { createTray } = require('./tray');

let mainWindow;
const isDev = !app.isPackaged;

// Asegurar directorio de datos
const userDataPath = app.getPath('userData');
const binDir = path.join(userDataPath, 'bin');
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

// Registrar esquema antes de app ready (requerido para protocol.handle)
protocol.registerSchemesAsPrivileged([
  { scheme: 'sakura-cover', privileges: { supportFetchAPI: true, bypassCSP: true, corsEnabled: true, stream: false } }
]);

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // La ventana se cierra normalmente y cierra la aplicación
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });

  // Taskbar progress bar (no monkey-patching)
  taskbarProgress.setWindow(mainWindow);

  const tray = createTray(mainWindow);

  ipcMain.on('tray:set-playing', (_, playing) => {
    tray.updateMenu(playing);
  });

  ipcMain.on('navigate', (_, page) => {
    mainWindow.show();
    mainWindow.webContents.send('navigate', page);
  });

  require('./ipc/ipc-download')(ipcMain, mainWindow);

  require('./ipc/ipc-library')(ipcMain, mainWindow);
  require('./ipc/ipc-metadata')(ipcMain, mainWindow);
  require('./ipc/ipc-queue')(ipcMain, mainWindow);
  require('./ipc/ipc-lyrics')(ipcMain, mainWindow);
  require('./ipc/ipc-search')(ipcMain, mainWindow);
  require('./ipc/ipc-dependencies')(ipcMain, mainWindow);
  require('./ipc/ipc-home')(ipcMain, mainWindow);

  // Protocolo para portadas (evita enviar base64 por IPC)
  protocol.handle('sakura-cover', async (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname).replace(/^\//, '');
    if (!filePath || !fs.existsSync(filePath)) return new Response(null, { status: 404 });
    const cover = await getCover(filePath);
    if (!cover) return new Response(null, { status: 404 });
    return new Response(cover.data, {
      status: 200,
      headers: { 'Content-Type': cover.format, 'Cache-Control': 'max-age=31536000' }
    });
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// Controles de ventana
ipcMain.handle('window:minimize', () => mainWindow.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('window:close', () => {
  app.isQuitting = true;
  mainWindow.close();
});
ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized());

// Diálogos del sistema
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:confirm', async (_, { message, title }) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Cancelar', 'Confirmar'],
    defaultId: 1,
    message,
    title: title || 'Confirmar'
  });
  return result.response === 1;
});

// Rutas del sistema
ipcMain.handle('get:paths', () => ({
  homeDir: app.getPath('home'),
  musicDir: app.getPath('music'),
}));

// Shell operations
ipcMain.handle('shell:openPath', async (_, filePath) => {
  await shell.openPath(filePath);
});

ipcMain.handle('shell:showItemInFolder', (_, filePath) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('shell:trashItem', async (_, filePath) => {
  await shell.trashItem(filePath);
});

app.on('window-all-closed', () => {
  // Do not quit if tray is active
});