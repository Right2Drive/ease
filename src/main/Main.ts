/**
 * Entry file for the electron application.
 *
 * Written from a template found here [http://blog.dmbcllc.com/typescript-and-electron-the-right-way/]
 */

import { BrowserWindow } from "electron";
import * as Constants from "../constants/Constants";
import { listen } from "./ipc/Listener";

export default class Main {
    private static mainWindow: Electron.BrowserWindow;
    private static application: Electron.App;
    private static BrowserWindow: typeof BrowserWindow;

    private static onWindowAllClosed() {
        if (process.platform !== "darwin") {
            Main.application.quit();
        }
    }

    private static onClose() {
        // Dereference the window object.
        Main.mainWindow = null;
    }

    private static onReady() {
        Main.mainWindow = new Main.BrowserWindow({
            width: Constants.DEFAULT_WIDTH,
            height: Constants.DEFAULT_HEIGHT,
            minHeight: Constants.MINIMUM_HEIGHT,
            minWidth: Constants.MINIMUM_WIDTH,
            frame: false,
            webPreferences: {
                experimentalFeatures: true,
            },
        });
        Main.mainWindow.loadURL("file://" + __dirname + "/../../../src/render/index.html");
        Main.mainWindow.on("closed", Main.onClose);

        // Listen for ipc messages and window changes
        listen(Main.mainWindow);
    }

    private static onFileOpen(event: Event) {
        event.preventDefault();
    }

    public static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
        Main.BrowserWindow = browserWindow;
        Main.application = app;
        Main.application.on("window-all-closed", Main.onWindowAllClosed);
        Main.application.on("open-file", Main.onFileOpen);
        Main.application.on("ready", Main.onReady);
    }
}
