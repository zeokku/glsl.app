// minimal subset for simple text styling
export const md = (raw: string) => {
  return raw
    .split(/\n{2,}/g)
    .map(p => {
      let isHeader = false;

      p = p
        .replace(/^(#+) (.+)/gm, (_, h, title) => {
          isHeader = true;

          let l = h.length;
          return `<h${l}>${title}</h${l}>`;
        })
        .replace(/(?:[ \t]*- .*(?:\r?\n)?)+/g, list => {
          let formatList = (source: string) =>
            "<ul>" +
            source
              .split(/^[ \t]*-/gm)
              .map(l => l.trim())
              .filter(Boolean)
              .map(l => "<li>" + l + "</li>")
              .join("") +
            "</ul>\n"; // @note add new line to split nested list from tailing items

          // @note allow only 1 level deep
          let withNested = list.replace(/(?:[ \t]+- .*(?:\r?\n)?)+/g, formatList);

          return formatList(withNested);
        })
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\b_([^_]+)_\b/g, "<i>$1</i>")
        .replace(/\*\*([^\*]+)\*\*/g, "<b>$1</b>")
        .replace(
          /\[(.+)\]\((.+)\)/g,
          (_, title, url) => `<a target="_blank" href="${url}">${title}</a>`
        );

      return isHeader ? p : "<p>" + p + "</p>";
    })
    .join("");
};
