# typebox-genx

[![GitHub Actions](https://github.com/ilyhalight/typebox-genx/actions/workflows/build.yml/badge.svg)](https://github.com/ilyhalight/typebox-genx/actions/workflows/build.yml)
[![npm](https://img.shields.io/bundlejs/size/@toil/typebox-genx)](https://www.npmjs.com/package/@toil/typebox-genx)
[![en](https://img.shields.io/badge/lang-English%20%F0%9F%87%AC%F0%9F%87%A7-white)](README.md)
[![ru](https://img.shields.io/badge/%D1%8F%D0%B7%D1%8B%D0%BA-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9%20%F0%9F%87%B7%F0%9F%87%BA-white)](README-RU.md)

typebox-genx (TypeBox Generator eXtended) is a code generation tool that extends `@sinclair/typebox-codegen` package with import functionality

## Installation

Install via Bun:

```bash
bun install @toil/typebox-genx
```

Install via Node:

```bash
npm install @toil/typebox-genx
```

## Before starting

This lib is **very very very very unstable** and some parts of planned functionality aren't available.

Lib work bad with scopes and i mean you have separate files for types

Supports only 1 type of import by line. Any of these code variants are valid:

> [!WARNING]
> Now you can only import with `import {...} from "..."`. Also you can use "type".

```js
import type { ClientOpts } from "@vot.js/node";
// or
// import { ClientOpts as RenamedOpts } from "@vot.js/node";
// or
import { Client, type ClientOpts } from "@vot.js/node";
// or
// import * as Client from "@vot.js/node";
// and many more
```

These code variants unsupported:

```js
import Client, { ClientOpts } from "@vot.js/node";
// or
import "@vot.js/node";
```

Now `typeof variable` unsupported too

## Getting started

The library class provides several methods:

```js
const genx = new GenX({
  root: path.join(__dirname),
  includeNearbyFiles: true,
});

// read from input dir and write to output
await genx.generateByDir(
  path.join(__dirname, "src/types"),
  path.join(__dirname, "dist"),
);

// read file and return result to variable
const codeByFile = await genx.generateByFile(
  path.join(__dirname, "src/types/with.ts"),
);

// read string and return result to variable
const raw = `import type { RequestMethod } from "@toil/translate/types/providers/base";

export type Test = {
  method: RequestMethod;
};`;

const codeByStr = await genx.generateByCode(raw);

// clear saved imports and depends list if needed
genx.clearData();
```

## Build

To build, you must have:

- [Bun](https://bun.sh/)

Don't forget to install the dependencies:

```bash
bun install
```

Start building:

```bash
bun build:all
```

## Tests

The library has minimal test coverage to check its performance.

Run the tests:

```bash
bun test
```
