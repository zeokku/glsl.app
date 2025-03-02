import { renameLocalStorageEntry } from "./utils/storageMigration";

const settingsStorageKey = "\0glsl-app-settings";
renameLocalStorageEntry("\0settings", settingsStorageKey);

const settings = Object.assign(
  {
    glowUi: true,
    editorMinimap: true,
    printWidth: 75,
    tabSize: 2,
    offlineShare: false,
    npmPackageProvider: "https://www.unpkg.com/",
    cachePackages: false,
  },
  // because json can't parse undefined only null
  JSON.parse(localStorage[settingsStorageKey] ?? null) as {}
);

type ISettings = typeof settings;

export const getAllSettings = () => settings;
export const getSetting = <K extends keyof ISettings>(key: K) => settings[key];
export const setSettings = (o: Partial<ISettings>) => {
  Object.assign(settings, o);
  localStorage[settingsStorageKey] = JSON.stringify(settings);
};
