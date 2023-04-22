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

const cacheStore = createStore("cache", "store");

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
    l.reduce((prev: number, cur: typeof l[number]) => prev + cur.length, 0)
  );

export const clearPersistentCache = async () => clear(cacheStore);
