import { get, set, update, keys, del, entries } from "idb-keyval";

/*
localStorage.set('\0settings');
*/

// https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

export interface IShader {
  created: ReturnType<typeof Date.now>;
  // modified: this["created"];

  code: string;
}

const shaderCtrKey = "\0new-shader-ctr";

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

export const saveShader = async (name: string, shader: IShader) => {
  return set(name, shader);
};

export const renameShader = async (
  oldName: string,
  newName: string
  //   force = false
) => {
  if (await get<IShader>(newName)) throw "Shader with this name already exists!";

  let shader = await get<IShader>(oldName);

  return del(oldName).then(() => set(newName, shader));
};

export const getAllShaders = async () => {
  return entries<string, IShader>();
};

export const getShader = async (name: string) => {
  return get<IShader | null>(name);
};

export const deleteShader = async (name: string) => {
  return del(name);
};

const lastOpenShaderKey = "\0last-open-shader";

export const setLastOpenShader = (name: string) => localStorage.setItem(lastOpenShaderKey, name);
export const getLastOpenShader = () => localStorage.getItem(lastOpenShaderKey);
