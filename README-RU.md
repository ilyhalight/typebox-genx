# typebox-genx

[![GitHub Actions](https://github.com/ilyhalight/typebox-genx/actions/workflows/build.yml/badge.svg)](https://github.com/ilyhalight/typebox-genx/actions/workflows/build.yml)
[![npm](https://img.shields.io/bundlejs/size/@toil/typebox-genx)](https://www.npmjs.com/package/@toil/typebox-genx)
[![en](https://img.shields.io/badge/lang-English%20%F0%9F%87%AC%F0%9F%87%A7-white)](README.md)
[![ru](https://img.shields.io/badge/%D1%8F%D0%B7%D1%8B%D0%BA-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9%20%F0%9F%87%B7%F0%9F%87%BA-white)](README-RU.md)

typebox-genx (TypeBox Generator eXtended) это инструмент для генерации кода, который расширяет пакет `@sinclair/typebox-codegen` с помощью функционала импорта

## Установка

Установка с помощью Bun:

```bash
bun install @toil/typebox-genx
```

Установка с помощью Node:

```bash
npm install @toil/typebox-genx
```

## Перед началом

Эта библиотека **очень очень очень очень нестабильна**, и некоторые части функционала еще недоступны.

Библиотека плохо работает с областью видимости и я надеюсь, что у вас есть отдельные файлы для типов

Библиотека поддерживает только 1 тип импорта в строке. Любой из этих вариантов кода поддерживается:

> [!WARNING]
> Сейчас поддерживается импорт только с помощью `import {...} from "..."`. Еще вы можете использовать "type".

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

Эти варианты кода не поддерживаются:

```js
import Client, { ClientOpts } from "@vot.js/node";
// or
import "@vot.js/node";
```

Сейчас `typeof variable` и работа с workspaces тоже не поддерживается

## Начало работы

Библиотека предоставляет несколько методов:

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

## Сборка

Для сборки необходимо наличие:

- [Bun](https://bun.sh/)

Не забудьте установить зависимости:

```bash
bun install
```

Запустите сборку:

```bash
bun build:all
```

## Тесты

Библиотека имеет минимальное покрытие тестами для проверки ее работоспособности.

Запустить тесты:

```bash
bun test
```
