import {
  get,
  set,
  update,
  keys,
  del,
  entries,
  createStore,
  getMany,
  values,
  clear,
} from "idb-keyval";
import { moveIndexedDb } from "./utils/storageMigration";

const dbName = "glsl-app-offline-cache";
const storeName = "store";

const cacheStore = createStore(dbName, storeName);
await moveIndexedDb("cache", "store", dbName, storeName);

// @todo
// export const getCachedItems = (paths: string[]) => getMany(paths, cacheStore);

export const getPersistentCacheItem = (path: string) => get<string | undefined>(path, cacheStore);

export const persistentCacheItem = (path: string, content: string) =>
  set(path, content, cacheStore);

/**
 *
 * @returns size in bytes
 */
export const getPersistentCacheSize = async () =>
  values<string>(cacheStore).then(l =>
    l.reduce((prev: number, cur: (typeof l)[number]) => prev + cur.length, 0)
  );

export const clearPersistentCache = async () => clear(cacheStore);
