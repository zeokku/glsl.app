import { renameLocalStorageEntry } from "@/utils/storeMigration2";

const SETTINGS_STORAGE_KEY = "glsl-app-settings";
renameLocalStorageEntry("\0settings", SETTINGS_STORAGE_KEY);
renameLocalStorageEntry("\0glsl-app-settings", SETTINGS_STORAGE_KEY);

const DEFAULT_SETTINGS = {
  glowUi: true,
  editorMinimap: true,
  printWidth: 75,
  tabSize: 2,
  offlineShare: false,
  npmPackageProvider: "https://www.unpkg.com/",
  cachePackages: false,
  manualRecompilation: false,
  lang: (new URLSearchParams(location.search).get("lang") ?? navigator.language).split("-")[0],
};

/**
 * Internal settings state
 */
const settings = Object.assign(
  DEFAULT_SETTINGS,
  // because json can't parse undefined only null
  JSON.parse(localStorage[SETTINGS_STORAGE_KEY] ?? null) as {}
);

type ISettings = typeof DEFAULT_SETTINGS;

export const getAllSettings = () => settings;
export const getSetting = <K extends keyof ISettings>(key: K) => settings[key];
/**
 * Accepts partial settings object, which would be merged into internal state and then stored.
 * @param o
 */
export const setSettings = (o: Partial<ISettings>) => {
  Object.assign(settings, o);
  localStorage[SETTINGS_STORAGE_KEY] = JSON.stringify(settings);
};
