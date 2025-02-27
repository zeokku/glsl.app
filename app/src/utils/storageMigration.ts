import { createStore, entries, setMany } from "idb-keyval";

/**
 * Renames a key in local storage if present
 * @param oldKey previous key to move data from
 * @param newKey new key to use
 */
export const renameLocalStorageEntry = (oldKey: string, newKey: string) => {
  if (localStorage[oldKey]) {
    localStorage[newKey] = localStorage[oldKey];
    localStorage.removeItem(oldKey);
  }
};

const databaseExists = async (name: string) => {
  let request = indexedDB.open(name);

  // @note upgradeneeded is triggered on new db creation or version update
  return new Promise(resolve => {
    request.onupgradeneeded = e => {
      console.log("upgrade", e);

      // @ts-ignore
      e.target.transaction.abort();

      resolve(false);
    };

    request.onsuccess = e => {
      console.log("onsuccess", e);

      resolve(true);
    };
  });
};

export const moveIndexedDb = async (
  oldDbName: string,
  oldStoreName: string,
  newDbName: string,
  newStoreName: string
) => {
  // if (await indexedDB.databases().then(dbs => dbs.find(db => db.name === oldDbName))) {
  if (await databaseExists(oldDbName)) {
    const oldStore = createStore(oldDbName, oldStoreName);
    const data = await entries(oldStore);

    const newStore = createStore(newDbName, newStoreName);
    await setMany(data, newStore);

    indexedDB.deleteDatabase(oldDbName);
  }
};
