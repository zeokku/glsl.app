export const getLines = (str: string) => str.split(/\r?\n/);

export const getNumberOfLines = (str: string) => {
  let num = 1;

  for (let char of str) {
    if (char === "\n") num += 1;
  }

  return num;
};
