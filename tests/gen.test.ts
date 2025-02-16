import { test, expect } from "bun:test";
import path from "node:path";

import GenX from "../src/client";

test("gen code with package", async () => {
  const code = `import type { RequestMethod } from "@toil/translate/types/providers/base";

export type Test = {
  method: RequestMethod;
};`;
  const genx = new GenX({
    root: path.join(__dirname, "..", "examples"),
  });
  const result = await genx.generateByCode(code);
  expect(result).toEqual(`import { Type, Static } from '@sinclair/typebox'


export type RequestMethod = Static<typeof RequestMethod>
export const RequestMethod = Type.Union([
Type.Literal("GET"),
Type.Literal("POST"),
Type.Literal("PUT"),
Type.Literal("DELETE"),
Type.Literal("PATCH")
])

export type Test = Static<typeof Test>
export const Test = Type.Object({
method: RequestMethod
})`);
});
