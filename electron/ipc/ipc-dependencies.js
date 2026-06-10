const { ensureDependencies, getToolVersions, updateYtDlp, updateFfmpeg } = require('../core/dependency-manager');

module.exports = (ipcMain, mainWindow) => {
  const sendToWindow = (event, data) => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      try { mainWindow.webContents.send(event, data); } catch {}
    }
  };
  
  ipcMain.handle('check_dependencies', async () => {
    const versions = await getToolVersions();
    return { 
      ytdlp: !!versions.yt_dlp, 
      ffmpeg: !!versions.ffmpeg 
    };
  });
  
  ipcMain.handle('setup_dependencies', async (event) => {
    await ensureDependencies((message, progress) => {
      event.sender.send('setup-progress', { message, progress });
    });
    return true;
  });
  
  ipcMain.handle('get_tool_versions', async () => {
    console.log('get_tool_versions called');
    const versions = await getToolVersions();
    console.log('Versions:', versions);
    return versions;
  });
  
  ipcMain.handle('update_tool', async (_, { tool }) => {
    if (tool === 'yt-dlp') {
      await updateYtDlp((message, progress) => {
        sendToWindow('update-progress', { tool, message, progress });
      });
    } else if (tool === 'ffmpeg') {
      await updateFfmpeg((message, progress) => {
        sendToWindow('update-progress', { tool, message, progress });
      });
    }
    return await getToolVersions();
  });
};