interface ISettings {
  npmPackageProvider: string;
  cachePackages: boolean;
}

const settingsStorageKey = "\0settings";

// localStorage[settingsStorageKey] ??= {};

const settings: ISettings = Object.assign(
  {
    npmPackageProvider: "https://www.unpkg.com/",
    cachePackages: false,
  } as ISettings,
  // because json can't parse undefined only null
  JSON.parse(localStorage[settingsStorageKey] ?? null)
);

export const getSetting = <K extends keyof ISettings>(key: K) => settings[key];
export const setSetting = <K extends keyof ISettings>(o: {
  [key in K]: ISettings[K];
}) => {
  Object.assign(settings, o);
  localStorage[settingsStorageKey] = JSON.stringify(settings);
};
