import { get, set, update, keys, del, entries, createStore } from "idb-keyval";
import { moveIndexedDb, renameLocalStorageEntry } from "./utils/storageMigration";

/*
localStorage.set('\0settings');
*/

// https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

export interface IShader {
  created: ReturnType<typeof Date.now>;
  // modified: this["created"];

  code: string;
}

const shaderCtrKey = "\0glsl-app-shader-ctr";
renameLocalStorageEntry("\0new-shader-ctr", shaderCtrKey);

// @ts-expect-error
export const getShaderCtr = () => parseInt(localStorage.getItem(shaderCtrKey) ?? 0);

export const defaultShaderName = "New Shader";

export const findNonConflictingName = async () => {
  let name = defaultShaderName;
  let ctr = getShaderCtr();

  if (ctr !== 0) name = defaultShaderName + " " + ctr;

  let namesList = await keys();

  while (namesList.includes(name)) {
    ctr += 1;
    name = defaultShaderName + " " + ctr;
  }

  // @note store next ctr
  // @ts-expect-error
  localStorage.setItem(shaderCtrKey, ctr + 1);

  return name;
};

const dbName = "glsl-app-shaders";
const storeName = "store";

const shadersStore = createStore(dbName, storeName);
await moveIndexedDb("keyval-store", "keyval", dbName, storeName);

export const saveShader = async (name: string, shader: IShader) => {
  return set(name, shader, shadersStore);
};

export const renameShader = async (
  oldName: string,
  newName: string
  //   force = false
) => {
  if (await get<IShader>(newName, shadersStore)) throw "Shader with this name already exists!";

  let shader = await get<IShader>(oldName, shadersStore);

  return del(oldName, shadersStore).then(() => set(newName, shader, shadersStore));
};

export const getAllShaders = async () => {
  return entries<string, IShader>(shadersStore);
};

export const getShader = async (name: string) => {
  return get<IShader | null>(name, shadersStore);
};

export const deleteShader = async (name: string) => {
  return del(name, shadersStore);
};

const lastOpenShaderKey = "\0glsl-app-last-shader";
renameLocalStorageEntry("\0last-open-shader", lastOpenShaderKey);

export const setLastOpenShader = (name: string) => localStorage.setItem(lastOpenShaderKey, name);
export const getLastOpenShader = () => localStorage.getItem(lastOpenShaderKey);
