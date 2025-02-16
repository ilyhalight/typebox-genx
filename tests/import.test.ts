import { test, expect } from "bun:test";

import GenX from "../src/client";

test("import default", () => {
  const code = `import Client from "@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "default",
    alias: "Client",
    from: "@vot.js/node",
  });
});

test("import all with alias", () => {
  const code = `import * as Client from "@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "all",
    alias: "Client",
    from: "@vot.js/node",
  });
});

test("import some", () => {
  const code = `import { ClientOpts } from "@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "some",
    items: [
      {
        isType: false,
        alias: "",
        content: "ClientOpts",
      },
    ],
    from: "@vot.js/node",
  });
});

test("import minify", () => {
  const code = `import{ClientOpts}from"@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "some",
    items: [
      {
        isType: false,
        alias: "",
        content: "ClientOpts",
      },
    ],
    from: "@vot.js/node",
  });
});

test("import type some", () => {
  const code = `import type { ClientOpts } from "@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "some",
    items: [
      {
        isType: true,
        alias: "",
        content: "ClientOpts",
      },
    ],
    from: "@vot.js/node",
  });
});

test("import type some (v2)", () => {
  const code = `import { type ClientOpts } from "@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "some",
    items: [
      {
        isType: true,
        alias: "",
        content: "ClientOpts",
      },
    ],
    from: "@vot.js/node",
  });
});

test("import many with type", () => {
  const code = `import {
  Client,
  ClientV2,
  type ClientOpts
} from "@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "some",
    items: [
      {
        isType: false,
        alias: "",
        content: "Client",
      },
      {
        isType: false,
        alias: "",
        content: "ClientV2",
      },
      {
        isType: true,
        alias: "",
        content: "ClientOpts",
      },
    ],
    from: "@vot.js/node",
  });
});

test("import type many", () => {
  const code = `import type {
  Client,
  ClientV2,
  ClientOpts
} from "@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "some",
    items: [
      {
        isType: true,
        alias: "",
        content: "Client",
      },
      {
        isType: true,
        alias: "",
        content: "ClientV2",
      },
      {
        isType: true,
        alias: "",
        content: "ClientOpts",
      },
    ],
    from: "@vot.js/node",
  });
});

test("import type many with parted alias", () => {
  const code = `import type {
  Client,
  ClientV2 as NewClient,
  ClientOpts
} from "@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "some",
    items: [
      {
        isType: true,
        alias: "",
        content: "Client",
      },
      {
        isType: true,
        alias: "NewClient",
        content: "ClientV2",
      },
      {
        isType: true,
        alias: "",
        content: "ClientOpts",
      },
    ],
    from: "@vot.js/node",
  });
});

test("import some with alias", () => {
  const code = `import { ClientOpts as RenamedOpts } from "@vot.js/node"`;
  const result = GenX.parseImportLine(code);
  expect(result).toEqual({
    type: "some",
    items: [
      {
        isType: false,
        alias: "RenamedOpts",
        content: "ClientOpts",
      },
    ],
    from: "@vot.js/node",
  });
});

test("throw on import default and some (unsupported)", () => {
  const code = `import Client, { ClientOpts } from "@vot.js/node"`;
  const fail = () => GenX.parseImportLine(code);

  expect(fail).toThrow("Invalid import statement");
});

test("throw on import side-effects only module (unsupported)", () => {
  const code = `import "@vot.js/node"`;
  const fail = () => GenX.parseImportLine(code);

  expect(fail).toThrow("Invalid import statement");
});
