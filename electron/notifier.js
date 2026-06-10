const { Notification, shell } = require('electron');
const path = require('path');

function notifyDownloadComplete(title, filePath) {
  const notif = new Notification({
    title: 'Descarga completada',
    body: `"${title}" se descargó correctamente`,
  });
  notif.on('click', () => {
    if (filePath) {
      const dir = path.dirname(filePath);
      shell.openPath(dir);
    }
  });
  notif.show();
}

function notifyDownloadError(title, errorMsg) {
  const notif = new Notification({
    title: 'Error en descarga',
    body: `"${title}" falló: ${errorMsg || 'Error desconocido'}`,
  });
  notif.show();
}

module.exports = { notifyDownloadComplete, notifyDownloadError };
