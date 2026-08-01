import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const distDir = process.env.ASTROTOOLS_NEXT_DIST_DIR?.trim() || ".next";
if (!/^\.next(?:-[a-z0-9-]+)?$/.test(distDir)) {
  throw new Error(
    "ASTROTOOLS_NEXT_DIST_DIR must be .next or a .next-* directory name",
  );
}

const copies = [
  [resolve("public"), resolve(distDir, "standalone/public")],
  [
    resolve(distDir, "static"),
    resolve(distDir, "standalone", distDir, "static"),
  ],
];

for (const [source, destination] of copies) {
  await rm(destination, { force: true, recursive: true });
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}
