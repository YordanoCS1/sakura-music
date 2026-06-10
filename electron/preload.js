const { contextBridge, ipcRenderer } = require('electron');

function getHomeDir() {
  const home = process.env.USERPROFILE || process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH;
  return home || 'C:\\Users\\default';
}

contextBridge.exposeInMainWorld('electronAPI', {
  homeDir: getHomeDir(),
  musicDir: getHomeDir() + (process.platform === 'win32' ? '\\Music' : '/Music'),
  invoke: (channel, args) => {
    const validChannels = [
      'window:minimize', 'window:maximize', 'window:close', 'window:isMaximized',
      'dialog:openFolder', 'dialog:confirm',
      'shell:openPath', 'shell:showItemInFolder', 'shell:trashItem',
      'get_video_info', 'download_media', 'search_youtube', 'get_trending',
      'list_directory', 'get_file_metadata', 'lib_delete_files',
      'save_metadata', 'fetch_itunes_cover', 'fetch_itunes_song', 'download_cover_to_temp', 'save_base64_to_temp', 'fetch_lyrics', 'fetch_folder_cover', 'fetch_artist_cover', 'save_folder_cover',
      'dialog:openImage',
      'queue_add', 'queue_add_playlist', 'queue_get_all', 'queue_get_grouped',
      'queue_remove', 'queue_clear_completed', 'queue_retry',
      'check_dependencies', 'setup_dependencies', 'get_tool_versions', 'update_tool',
      'get_home_stats', 'add_download_history', 'get_download_history', 'clear_download_history',
      'add_recent_song', 'get_recent_songs'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, args);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },
  on: (channel, callback) => {
    const validChannels = [
      'download-progress', 'download-completed', 'download-error',
      'queue-progress', 'queue-updated', 'queue-item-completed', 'queue-item-error',
      'setup-progress', 'update-progress',
      'tray-play-pause', 'tray-next', 'tray-previous', 'navigate'
    ];
    if (validChannels.includes(channel)) {
      const listener = (_, data) => callback(data);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
  send: (channel, data) => {
    const validChannels = ['tray:set-playing', 'navigate'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  off: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  platform: process.platform,
});