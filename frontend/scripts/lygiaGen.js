// https://lygia.xyz/glsl.json

let defs = await fetch("").then(r => r.json());

let parsed = {};

defs.forEach(d => {
    let cur = parsed;

    d.split("/").forEach(p => {
        cur[p] ??= {};
        cur = cur[p];
    });
});

////

copy(JSON.stringify(parsed));
