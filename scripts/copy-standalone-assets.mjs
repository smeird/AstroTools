import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const copies = [
  [resolve("public"), resolve(".next/standalone/public")],
  [resolve(".next/static"), resolve(".next/standalone/.next/static")],
];

for (const [source, destination] of copies) {
  await rm(destination, { force: true, recursive: true });
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}
