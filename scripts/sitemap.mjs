import { readFile, writeFile } from "fs/promises";
import { SitemapStream, streamToPromise } from "sitemap";
import { Readable } from "stream";

const pages = ["/"].map(url => ({
  url,
  changefreq: "daily",
  priority: 1.0,
}));

const stream = new SitemapStream({ hostname: "https://glsl.app" });

streamToPromise(Readable.from([pages].flat()).pipe(stream)).then(data =>
  writeFile("public/sitemap.xml", data)
);
