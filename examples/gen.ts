import path from "node:path";

import GenX from "../src/client";

const genx = new GenX({
  root: path.join(__dirname),
  includeNearbyFiles: true,
});

// const code = await genx.generateByFile(
//   path.join(__dirname, "src/types/with.ts")
// );

const code = await genx.generateByDir(
  path.join(__dirname, "src/types"),
  path.join(__dirname, "dist"),
);

// const code = await genx.generateByCode(
//   `export type FetchFunction = (input: string | URL | Request, init?: any) => Promise<Response>;`
// );

console.log(code);
