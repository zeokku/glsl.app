import { renameLocalStorageEntry } from "./utils/storageMigration";

interface ISettings {
  editorMinimap: boolean;
  printWidth: number;
  tabSize: number;
  offlineShare: boolean;
  npmPackageProvider: string;
  cachePackages: boolean;
}

const settingsStorageKey = "\0glsl-app-settings";
renameLocalStorageEntry("\0settings", settingsStorageKey);

const settings: ISettings = Object.assign(
  {
    editorMinimap: true,
    printWidth: 75,
    tabSize: 2,
    offlineShare: false,
    npmPackageProvider: "https://www.unpkg.com/",
    cachePackages: false,
  } as ISettings,
  // because json can't parse undefined only null
  JSON.parse(localStorage[settingsStorageKey] ?? null)
);

export const getAllSettings = () => settings;
export const getSetting = <K extends keyof ISettings>(key: K) => settings[key];
export const setSettings = (o: Partial<ISettings>) => {
  Object.assign(settings, o);
  localStorage[settingsStorageKey] = JSON.stringify(settings);
};
