import { readdir, readFile, stat } from "node:fs/promises";
import { gzip as gzipBuffer } from "node:zlib";
import { promisify } from "node:util";
import path from "node:path";

const gzip = promisify(gzipBuffer);
const dist = path.resolve("dist");
const assetsDir = path.join(dist, "assets");
const files = await readdir(assetsDir);
const jsFiles = files.filter((file) => file.endsWith(".js"));

async function gzipBytes(file) {
  const content = await readFile(path.join(assetsDir, file));
  return (await gzip(content)).byteLength;
}

const sizes = await Promise.all(jsFiles.map(async (file) => ({ file, bytes: await gzipBytes(file) })));
const entry = sizes.find(({ file }) => /^index-[^/]+\.js$/.test(file));
const largestAsync = sizes
  .filter(({ file }) => file !== entry?.file)
  .sort((a, b) => b.bytes - a.bytes)[0];
const sw = await readFile(path.join(dist, "sw.js"), "utf8");
const precacheUrls = [...sw.matchAll(/url:"([^"]+)"/g)].map((match) => match[1]);
const precacheBytes = (await Promise.all(precacheUrls.map(async (url) => {
  try {
    return (await stat(path.join(dist, url))).size;
  } catch {
    return 0;
  }
}))).reduce((total, size) => total + size, 0);

const maxEntry = 250 * 1024;
const maxAsync = 200 * 1024;
const maxPrecache = 1.5 * 1024 * 1024;
const failures = [];

if (!entry || entry.bytes > maxEntry) failures.push(`initial entry ${entry?.bytes ?? 0} B gzip exceeds ${maxEntry} B`);
if (!largestAsync || largestAsync.bytes > maxAsync) failures.push(`largest async chunk ${largestAsync?.file ?? "missing"} at ${largestAsync?.bytes ?? 0} B gzip exceeds ${maxAsync} B`);
if (precacheBytes > maxPrecache) failures.push(`precache ${precacheBytes} B exceeds ${maxPrecache} B`);

const assetStats = await Promise.all(files.map(async (file) => stat(path.join(assetsDir, file))));
const emittedBytes = assetStats.reduce((total, current) => total + current.size, 0);
console.log(`Initial entry: ${entry?.file ?? "missing"} (${entry?.bytes ?? 0} B gzip)`);
console.log(`Largest async chunk: ${largestAsync?.file ?? "missing"} (${largestAsync?.bytes ?? 0} B gzip)`);
console.log(`Emitted asset bytes: ${emittedBytes}`);
console.log(`Precache bytes: ${precacheBytes}`);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
