import { createStore, entries, setMany } from "idb-keyval";

/**
 * Renames a key in local storage if present
 * @param oldKey previous key to move data from
 * @param newKey new key to use
 */
export const renameLocalStorageEntry = (oldKey: string, newKey: string) => {
    if (localStorage[oldKey]) {
        localStorage[newKey] = localStorage[oldKey];
        localStorage.removeItem(oldKey)
    }
}

export const moveIndexedDb = async (oldDbName: string, oldStoreName: string, newDbName: string, newStoreName: string) => {
    if (await indexedDB.databases().then(dbs => dbs.find(db => db.name === oldDbName))) {
        const oldStore = createStore(oldDbName, oldStoreName);
        const data = await entries(oldStore);

        const newStore = createStore(newDbName, newStoreName)
        await setMany(data, newStore);

        indexedDB.deleteDatabase(oldDbName);
    }
}