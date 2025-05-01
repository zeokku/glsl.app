import { fetchLegacyDbContents } from "./utils/storeMigration2";

export interface IShader {
  id: number;

  name: string;
  code: string;

  created: number;
  modified: number;
}

export const GLSL_APP_DATABASE_NAME = "glsl-app-db";
export const GLSL_APP_DATABASE_VERSION = 1;

export const SHADER_STORE_NAME = "shaders";
export const CACHE_STORE_NAME = "cache";

const openRequest = indexedDB.open(GLSL_APP_DATABASE_NAME, GLSL_APP_DATABASE_VERSION);

const db = await new Promise<IDBDatabase>((resolve, reject) => {
  // @note newly created or upgraded
  openRequest.onupgradeneeded = async () => {
    // @todo @commit `event.target!.result` untyped!
    const db = openRequest.result;

    db.createObjectStore(SHADER_STORE_NAME, {
      autoIncrement: true,
      keyPath: "id",
    });

    db.createObjectStore(CACHE_STORE_NAME, { keyPath: "url" });
    indexedDB.deleteDatabase("glsl-app-offline-cache");

    fetchLegacyDbContents().then(async legacyEntries => {
      // @note transaction is committed when using await, so get store again
      const shadersStore = getShaderStore();

      try {
        for (const legacyEntry of legacyEntries) {
          await handleRequest(shadersStore.add(legacyEntry));
        }

        console.warn("[debug] consider 'keyval-store' db deleted");
        // indexedDB.deleteDatabase("keyval-store");
        console.warn("[debug] consider 'glsl-app-shaders' db deleted");
        // indexedDB.deleteDatabase("glsl-app-shaders");
      } catch (e) {
        alert(e);
        return;
      }
    });
  };

  openRequest.onsuccess = () => resolve(openRequest.result);

  openRequest.onerror = () => {
    console.error("Error opening database", openRequest.error);
    alert("Error opening database\n(check console)");

    reject(null);
  };
});

/**
 * Promisify IDB request
 * @param request
 * @returns
 */
const handleRequest = <R extends IDBRequest>(request: R) => {
  const { resolve, reject, promise } = Promise.withResolvers<R>();

  request.onsuccess = () => resolve(request);
  request.onerror = () => reject(request);

  return promise;
};

/**
 * @private
 */
const getShaderStore = () =>
  db.transaction(SHADER_STORE_NAME, "readwrite").objectStore(SHADER_STORE_NAME);

/**
 * @private
 */
const shaderStoreRequest = <R extends IDBRequest>(getRequest: (store: IDBObjectStore) => R) => {
  const store = getShaderStore();

  const request = getRequest(store);

  return handleRequest(request);
};

/**
 * Adds a new shader or updates existing.
 *
 * To update the shader must have "id" property, to add a new one it shouldn't have the "id"
 *
 * Sets `created` timestamp and updates `modified` timestamp
 *
 * @param shader
 * @returns Shader ID
 */
export const updateShader = async (shader: Partial<IShader>) => {
  shader.created ??= Date.now();
  shader.modified = Date.now();

  const { result: id } = await shaderStoreRequest(s =>
    s.put(
      // @note shallow clone because it seems to fail with reactive objects
      { ...shader }
    )
  );

  shader.id = id as number;

  return shader as IShader;
};

export const deleteShader = async (shaderId: IShader["id"]) => {
  return shaderStoreRequest(s => s.delete(shaderId));
};

export const getShader = async (shaderId: IShader["id"]) => {
  const { result } = await shaderStoreRequest(s => s.get(shaderId));

  return result as IShader | undefined;
};

export const getAllShaders = async () => {
  const store = getShaderStore();

  const cursorRequest = store.openCursor();

  const result = [] as Array<IShader>;

  const { promise, resolve, reject } = Promise.withResolvers<typeof result>();

  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;

    if (!cursor) return resolve(result);

    result.push(cursor.value);

    cursor.continue();
  };

  cursorRequest.onerror = () => reject(cursorRequest);

  return promise;
};

//#region offline modules cache

/**
 * @private
 */
const getCacheStore = () =>
  db.transaction(CACHE_STORE_NAME, "readwrite").objectStore(CACHE_STORE_NAME);

export interface ICachedModule {
  url: string;
  code: string;
}

export const storeCachedModule = (item: ICachedModule) => {
  const store = getCacheStore();

  return handleRequest(store.put(item));
};

export const getCachedModule = async (resourceId: string) => {
  const store = getCacheStore();

  const { result } = await handleRequest(store.get(resourceId));

  return (result as ICachedModule)?.code;
};

export const getCacheSize = async () => {
  const store = getCacheStore();

  const { result } = await handleRequest(store.getAll());

  return (result as ICachedModule[]).reduce((size, { code }) => size + code.length, 0);
};

export const clearCache = () => {
  const store = getCacheStore();

  return handleRequest(store.clear());
};

//#endregion

const LAST_OPEN_SHADER_KEY = "glsl-app-last-shader-id";

export const setLastOpenShaderId = (id: IShader["id"]) =>
  localStorage.setItem(LAST_OPEN_SHADER_KEY, id!.toString());

export const getLastOpenShaderId = () =>
  parseInt(localStorage.getItem(LAST_OPEN_SHADER_KEY) as string) || null;
