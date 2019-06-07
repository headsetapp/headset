const electron = require('electron');
const windowStateKeeper = require('electron-window-state');
const squirrel = require('electron-squirrel-startup');
const AutoUpdater = require('headset-autoupdater');
const path = require('path');

const { version } = require('../package');
const logger = require('./lib/headsetLogger');

const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
} = electron;

// Delete the log file. Just a workaround until 'electron-log' is updated
logger.clear();

let win;
let player;

const isDev = (process.env.NODE_ENV === 'development');
logger.info(`Running as developer: ${isDev}`);

// Allows to autoplay video, which is disabled in newer versions of Chrome
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Exit the app if it starts from squirrel
if (squirrel) app.exit();

// Quit if second instance found and focus window of first instance
if (!app.requestSingleInstanceLock()) app.exit();

app.on('second-instance', () => {
  logger.info('Second instance of Headset found');
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

// Removes the application menu on all windows
Menu.setApplicationMenu(null);

function start() {
  new AutoUpdater();

  logger.info('Starting Headset');
  const mainWindowState = windowStateKeeper();

  win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: 375,
    height: 667,
    resizable: false,
    title: 'Headset',
    maximizable: false,
    useContentSize: true,
    icon: path.join(__dirname, 'icons', 'Headset.ico'),
    webPreferences: { nodeIntegration: true },
  });

  player = new BrowserWindow({
    width: 427,
    height: 300,
    closable: false,
    useContentSize: true,
    title: 'Headset - Player',
    icon: path.join(__dirname, 'icons', 'Headset.ico'),
    webPreferences: { nodeIntegration: true },
  });

  mainWindowState.manage(win);

  if (isDev) {
    win.loadURL('http://127.0.0.1:3000');

    // The embedded YouTube player only works on sites with domains and not just IP
    player.loadURL('http://lvh.me:3001');
    win.webContents.openDevTools();
  } else {
    win.loadURL('https://danielravina.github.io/headset/app/');
    player.loadURL('http://danielravina.github.io/headset/player-v2');
  }

  win.webContents.on('did-finish-load', () => {
    logger.info('Main window finished loading');

    win.webContents.executeJavaScript(`
      window.electronVersion = "v${version}"
    `);
  });

  player.webContents.on('did-finish-load', () => {
    logger.info('Player window finished loading');
    win.focus();
    setTimeout(() => player.minimize(), 2000);
  });

  player.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    const docsWin = new BrowserWindow({ closable: true });
    docsWin.loadURL(url);
    event.newGuest = docsWin;
  });

  win.on('close', () => {
    logger.info('Closing Headset');
    // after app closes in Win, the global shortcuts are still up, disabling it here.
    globalShortcut.unregisterAll();
    app.exit();
  });
} // end start


app.on('ready', start);

/*
 * This is the proxy between the 2 windows.
 * It receives messages from a renderer and send them to the other renderer
*/
ipcMain.on('win2Player', (e, args) => {
  logger.win2Player(args);

  player.webContents.send('win2Player', args);
});

ipcMain.on('player2Win', (e, args) => {
  logger.player2Win(args);

  try {
    win.webContents.send('player2Win', args);
  } catch (err) { /* window already closed */ }
});
