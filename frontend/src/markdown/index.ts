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
        .replace(/(?:- .*(?:\r?\n)?)+/g, list => {
          return (
            "<ul>" +
            list
              .split(/\r?\n/g)
              .map(l => (l ? "<li>" + l.slice(2) + "</li>" : ""))
              .join("") +
            "</ul>"
          );
        })
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/_([^_]+)_/g, "<i>$1</i>")
        .replace(/\*\*([^\*]+)\*\*/g, "<b>$1</b>");

      return isHeader ? p : "<p>" + p + "</p>";
    })
    .join("");
};
