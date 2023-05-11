import { getPersistentCacheItem, persistentCacheItem } from "./includesOfflineCache";
import { getSetting } from "./settings";
import { getLines, getNumberOfLines } from "./utils/stringUtils";

export const resourceCache = new Map<string, string>();

export type IIncludesData = [
  lineNumber: number,
  linesCount: number,
  includePath: string,
  // @todo error
  // https://www.typescriptlang.org/play?#code/C4TwDgpgBMCuYBsIEYoF4oG0BQUoA8AuKAO1gFsAjCAJwBpcoRiyraG8AvFi6+xgPQCotGgHsajAHQyAFJgDuPNvSgBnAPzFYJACYQAZgEsSEXQF0oAHyxLSsBAjrrlfcwEps57NlCQY8EjIAKL4kADGwGboUIx4mESsfM7M9irO3EnsUEpZqpqEOvrGphbWcViJvNmpeRmEdTkNDk4ued7YQgI+ftBwiBAADDGYAIbEoyQgzpQTU84yUvLhrrSWNpi6hGrANCYA5h7mANw94H2BQ6ERUboj45PTULOPzivt1lgP88+Er1BbHZ7EiHY5AA
  // @ts-ignore
  ...([code: string, error?: undefined] | [code: null, error: string])
];

// @note use g flag for .lastIndex
export const dependencyRegex = /^ *# *include +/g;

/**
 *
 * @param directiveValue part of the line after #include / #pragma glslify :
 * @returns
 */
// @note bruh since lygia's includes don't have ./ for relative imports, so modules should only be imported using <>, and process all quoted includes as relative or absolute
const extractDependencyPath = (directiveValue: string) => {
  let dependencyExtractedValue = directiveValue.match(
    /^(?:<([^>]+)>|(["'`]?)([^"'` ]+)\2)(?: *;? *)*$/
  );

  if (!dependencyExtractedValue) return null;

  let path = dependencyExtractedValue[1];

  if (path) {
    return {
      path,
      type: "module",
    } as const;
  }

  path = dependencyExtractedValue[3];

  return {
    path,
    type: /^https:/.test(path) ? "url" : "relative",
  };
};

interface IDependencyMeta {
  path: string;
  // editorLineNumber: number;
}

export const resolvePath = (
  { path, type }: Exclude<ReturnType<typeof extractDependencyPath>, null>,
  meta?: IDependencyMeta
) => {
  let resultingPath: string;

  switch (type) {
    case "module":
      // @note handle lygia separately because their package hasn't updated for years, so use code from gh directly
      if (path.startsWith("lygia/")) {
        resultingPath =
          "https://raw.githubusercontent.com/patriciogonzalezvivo/lygia/main/" +
          path.slice("lygia/".length);
      } else {
        resultingPath = new URL(path, getSetting("npmPackageProvider")).href;

        // @note if we reference only module name, don't append .glsl, let npm package provider resolve "main" field instead
        if (path.indexOf("/") === -1) {
          return resultingPath;
        }
      }

      break;
    case "relative":
      if (meta) {
        resultingPath = new URL(path, meta.path).href;
      } else {
        throw "Invalid include path: " + path;
      }
      break;

    case "url":
    default:
      resultingPath = path;
      break;
  }

  if (!resultingPath.endsWith(".glsl")) resultingPath += ".glsl";

  return resultingPath;
};

/**
 * tests if the line is a dependency and returns its path if found
 * @param line
 * @returns `undefined` when there's no dependency or `Object | null`
 */
export const checkForDependency = (line: string) => {
  dependencyRegex.lastIndex = 0;
  if (!dependencyRegex.exec(line)) return;

  return extractDependencyPath(line.slice(dependencyRegex.lastIndex));
};

export const processIncludes = async (
  shaderLines: Array<string>,
  currentIncludesData: Array<IIncludesData> | null,
  meta?: IDependencyMeta
) => {
  if (currentIncludesData) currentIncludesData.length = 0;

  let resultLines = await Promise.all(
    shaderLines.map(async (line, lineIndex): Promise<string> => {
      let dependencyMatch = line.match(dependencyRegex);

      let path = checkForDependency(line);

      if (path === undefined) return line;

      // invalid value
      if (path === null) {
        if (currentIncludesData)
          currentIncludesData.push([
            lineIndex + 1,
            1,
            "",
            null,
            "#include directive failed to load! Invalid syntax!",
          ]);

        return "";
      }

      // process deps

      let pathUrl = resolvePath(path, meta);

      // @note remove npm cdn host, so the resources won't dupe if user changes the provider
      let resourceId = pathUrl.replace(getSetting("npmPackageProvider"), "");

      let dependencyCode = resourceCache.get(resourceId);

      if (!dependencyCode) {
        dependencyCode = await getPersistentCacheItem(resourceId);

        if (!dependencyCode) {
          dependencyCode = await fetch(pathUrl)
            .then(r => {
              if (r.ok) {
                return r.text();
              } else {
                throw `\`#include\` directive failed to load! Is the URL valid?\n${pathUrl}`;
              }
            })
            .then(shader => processIncludes(getLines(shader), null, { path: pathUrl }))
            .catch(e => {
              if (meta) {
                // exit on first inner failed include
                throw e;
              } else {
                if (currentIncludesData)
                  currentIncludesData.push([1 + lineIndex, 1, pathUrl, null, e as string]);

                return "";
              }
            });

          // skip further processing
          if (dependencyCode === "") return "";

          if (getSetting("cachePackages")) persistentCacheItem(resourceId, dependencyCode!);
        }

        resourceCache.set(resourceId, dependencyCode!);
      }

      if (currentIncludesData)
        currentIncludesData.push([
          lineIndex + 1,
          getNumberOfLines(dependencyCode!),
          pathUrl,
          dependencyCode!,
        ]);

      return dependencyCode;
    })
  );

  return resultLines.join("\n");
};
