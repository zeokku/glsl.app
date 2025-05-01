/**
 * Proper line split by `\r?\n`, since when doing just `\n` it caused regex `$` not always match (because of the remaining `\r`)
 */
export const getLines = (str: string) => str.split(/\r?\n/);

export const getNumberOfLines = (str: string) => {
  let num = 1;

  for (let char of str) {
    if (char === "\n") num += 1;
  }

  return num;
};

export const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1);
