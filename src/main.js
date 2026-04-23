const { app, BrowserWindow } = require("electron");

// Create a new browser window and load the index.html file
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Password Manager",
    titleBarStyle: "hidden",
    ...(process.platform !== "darwin"
      ? {
          titleBarOverlay: {
            color: "#1a2933",
            symbolColor: "#ffffff",
          },
        }
      : {}),
  });

  win.loadFile("index.html");
};

// When the app is ready, create the browser window
app.whenReady().then(() => {
  createWindow();
});

// Quit the app when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
