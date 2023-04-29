let o = {};
String.raw``
  .split("\n")
  .filter(f => f)
  .map(e => {
    let path = e.split("lygia\\", 2)[1].split("\\");

    let subO = o;
    path.forEach(s => {
      if (s.endsWith(".glsl")) {
        subO[s] = null;
      } else {
        subO[s] ??= {};
        subO = subO[s];
      }
    });
  });

copy(JSON.stringify({ lygia: o }, null, 4));
