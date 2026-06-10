// Taskbar progress tracker — replaces monkey-patching of webContents.send
class TaskbarProgress {
  constructor() {
    this.activeIds = new Set();
    this.window = null;
  }

  setWindow(win) { this.window = win; }

  onProgress(id, progress) {
    if (progress === 0) this.activeIds.add(id);
    if (progress >= 100) this.activeIds.delete(id);
    if (this.window && !this.window.isDestroyed()) {
      if (this.activeIds.size > 0) this.window.setProgressBar(progress / 100);
      else this.window.setProgressBar(-1);
    }
  }

  onDone(id) {
    this.activeIds.delete(id);
    if (this.window && !this.window.isDestroyed() && this.activeIds.size === 0) {
      this.window.setProgressBar(-1);
    }
  }
}

module.exports = new TaskbarProgress();
