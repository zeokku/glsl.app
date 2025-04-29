import { IShader } from "@/storage2";

const fetchDbContents = async (dbName: string, storeName: string) => {
  const { resolve, promise } = Promise.withResolvers<Array<[string, any]> | null>();

  const openRequest = indexedDB.open(dbName);

  // @note legacy db doesn't exist @blog check for existence with abort() to prevent creation
  openRequest.onupgradeneeded = () => {
    openRequest.transaction!.abort();
  };

  openRequest.onsuccess = () => {
    const db = openRequest.result;

    const store = db.transaction(storeName, "readonly").objectStore(storeName);

    const cursorRequest = store.openCursor();

    const result = [] as Array<[string, any]>;

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;

      if (!cursor) {
        db.close();
        resolve(result);
        return;
      }

      result.push([cursor.key as string, cursor.value]);

      cursor.continue();
    };

    cursorRequest.onerror = () => {
      console.error(`fetchDbContents::cursor(${dbName}, ${storeName})`, cursorRequest.error);
      resolve(null);
    };
  };

  openRequest.onerror = () => {
    if (openRequest.error!.name !== "AbortError")
      console.error(`fetchDbContents::open(${dbName}, ${storeName})`, openRequest.error);

    resolve(null);
  };

  return promise;
};

/**
 * Fetch entries from old databases and transform them to current format
 * @returns
 */
export const fetchLegacyDbContents = async () => {
  let entries: Array<IShader> = [];

  const dbv1Contents = await fetchDbContents("keyval-store", "keyval");
  // @note if contents returned, then we successfully fetched all data from it and can safely delete it, although we need to store the contents first for safety
  if (dbv1Contents) {
    entries.push(
      //
      ...dbv1Contents.map(([name, shader]) => ({ name, ...shader }))
    );
  }

  const dbv2Contents = await fetchDbContents("glsl-app-shaders", "store");
  if (dbv2Contents) {
    entries.push(
      //
      ...dbv2Contents.map(([name, shader]) => ({ name, ...shader }))
    );
  }

  return entries;
};
