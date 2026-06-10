const isDev = !require('electron').app.isPackaged;

const logger = {
  log: (...args) => { if (isDev) console.log(...args); },
  warn: (...args) => { if (isDev) console.warn(...args); },
  error: (...args) => { console.error(...args); }, // always log errors
  info: (...args) => { if (isDev) console.info(...args); },
};

module.exports = logger;
