const { app, BrowserWindow } = require("electron");

// Create a new browser window and load the index.html file
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Password Manager",
    titleBarStyle: "hidden",
    ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}), // Use titleBarOverlay on non-macOS platforms for a modern look
    titleBarOverlay: {
      color: "#fff", // Background color of the title bar
      symbolColor: "#333", // Color of the window control symbols (close, minimize, maximize)
      height: 30, // Height of the title bar
    },
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
