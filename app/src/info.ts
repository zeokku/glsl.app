import buildTime from "📅";

let url = "/rr.webp";
fetch(url)
  .then(
    r => r.blob(),
    // @note return empty blob when offline and can't fetch
    () => null
  )
  .then(b => {
    const textStyle = "color: cyan; text-shadow: 0 0 1px black; font-weight: bold;";

    if (b) {
      let fr = new FileReader();
      fr.onload = ({ target: { result } }) => {
        // @note prevent terser to strip it
        window["console"].log(
          "%c" + "glsl.app build: " + buildTime,
          // @note fun fact i had to open dev tool for dev tool to debug this console message style
          `background: black url(${result}) center/contain no-repeat; padding-top: 12rem; padding-inline: 0.5rem; border-radius: 0.5rem; position: fixed; ${textStyle}`
        );
      };
      fr.readAsDataURL(b);
    } else {
      window["console"].log("%c" + "glsl.app build: " + buildTime, textStyle);
    }
  });

export {};
