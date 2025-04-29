import { renameLocalStorageEntry } from "./utils/storageMigration";

const settingsStorageKey = "glsl-app-settings";
renameLocalStorageEntry("\0settings", settingsStorageKey);
renameLocalStorageEntry("\0glsl-app-settings", settingsStorageKey);

const DEFAULT_SETTINGS = {
  glowUi: true,
  editorMinimap: true,
  printWidth: 75,
  tabSize: 2,
  offlineShare: false,
  npmPackageProvider: "https://www.unpkg.com/",
  cachePackages: false,
  manualRecompilation: false,
};

/**
 * Internal settings state
 */
const settings = Object.assign(
  DEFAULT_SETTINGS,
  // because json can't parse undefined only null
  JSON.parse(localStorage[settingsStorageKey] ?? null) as {}
);

type ISettings = typeof settings;

export const getAllSettings = () => settings;
export const getSetting = <K extends keyof ISettings>(key: K) => settings[key];
/**
 * Accepts partial settings object, which would be merged into internal state and then stored.
 * @param o
 */
export const setSettings = (o: Partial<ISettings>) => {
  Object.assign(settings, o);
  localStorage[settingsStorageKey] = JSON.stringify(settings);
};
