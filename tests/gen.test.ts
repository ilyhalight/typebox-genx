import { test, expect } from "bun:test";
import path from "node:path";

import GenX from "../src/client";

test("gen code with package", async () => {
  const code = `import type { RequestMethod } from "@toil/translate/types/providers/base";

export type Test = {
  method: RequestMethod;
};`;
  const genx = new GenX({
    root: path.join(__dirname, ".."),
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

test("gen code with workspaces", async () => {
  const code = `import type { SecondB } from "@tests/b";
import type { ThirdC } from "@tests/c";

export type Data = {
  hello: "world";
  meta: SecondB;
  other: ThirdC;
};`;
  const genx = new GenX({
    root: path.join(__dirname, "..", "examples", "packages", "testa"),
    workspaceRoot: path.join(__dirname, "..", "examples"),
  });
  const result = await genx.generateByCode(code);
  expect(result).toEqual(`import { Type, Static } from '@sinclair/typebox'


export type ThirdC = Static<typeof ThirdC>
export const ThirdC = Type.Object({
likes: Type.Number()
})

export type SecondB = Static<typeof SecondB>
export const SecondB = Type.Object({
views: Type.Number()
})

export type Data = Static<typeof Data>
export const Data = Type.Object({
hello: Type.Literal("world"),
meta: SecondB,
other: ThirdC
})`);
});
