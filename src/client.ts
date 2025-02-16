import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

import * as Codegen from "@sinclair/typebox-codegen";
import { Project } from "ts-morph";

import type {
  GenXOpts,
  ImportData,
  ImportMatches,
  ImportSomeItem,
} from "./types";

export const importRegex =
  /import\s*((type\s*)?\{([^}]+)\}|(\*\s*as\s+(\w+))|(\w+))\s*from\s*["']([^"']+)["']/;

export default class GenX {
  root: string;
  includeNearbyFiles: boolean;

  rootDepends = new Map();
  imports = new Map<string, Map<string, string>>();

  constructor({ root, includeNearbyFiles = false }: GenXOpts) {
    this.root = root;
    this.includeNearbyFiles = includeNearbyFiles;
  }

  private async getRootDepends() {
    if (this.rootDepends.size !== 0) {
      return this.rootDepends;
    }

    const content = await fs.readFile(path.resolve(this.root, "package.json"), {
      encoding: "utf8",
    });
    const packageJSON = JSON.parse(content);
    const {
      devDependencies = {},
      peerDependencies = {},
      dependencies = {},
    } = packageJSON;

    this.rootDepends = new Map(
      Object.entries({
        ...devDependencies,
        ...peerDependencies,
        ...dependencies,
      }),
    );

    return this.rootDepends;
  }

  private readTypeAlias(filePath: string, item: string) {
    const project = new Project();
    project.addSourceFilesAtPaths(filePath);
    const source = project.getSourceFile(filePath);
    return source?.getTypeAlias(item);
  }

  private readTypeAliasContent(filePath: string, item: string) {
    const typeAlias = this.readTypeAlias(filePath, item);
    if (!typeAlias) {
      return "";
    }

    return typeAlias.getText();
  }

  static normalizePath(filePath: string) {
    return path.resolve(path.normalize(filePath));
  }

  static calcFilePath(filePath: string) {
    // filePath = path.resolve(filePath);
    filePath = GenX.normalizePath(filePath);
    if (filePath.endsWith(".ts")) {
      return filePath;
    }

    let calculatedPath = `${filePath}.ts`;
    if (fsSync.existsSync(calculatedPath)) {
      return calculatedPath;
    }

    calculatedPath = path.resolve(filePath, "index.ts");
    if (fsSync.existsSync(calculatedPath)) {
      return calculatedPath;
    }

    return filePath;
  }

  private updateImports(filePath: string, item: string) {
    const importPath = GenX.calcFilePath(filePath);
    const oldImports = this.imports.get(importPath) ?? new Map();
    this.imports.set(
      importPath,
      oldImports.set(item, this.readTypeAliasContent(importPath, item)),
    );
    return true;
  }

  private readTSData(filePath: string, item: string) {
    const items = this.imports.get(GenX.calcFilePath(filePath));
    if (items && items.has(item)) {
      console.warn("Item already exists");
      return "";
    }

    const typeAlias = this.readTypeAlias(filePath, item);
    if (!typeAlias) {
      console.warn("No type alias");
      return "";
    }

    this.updateImports(filePath, item);

    return typeAlias
      .getType()
      .getProperties()
      .map((property) => {
        const propertyType = property.getTypeAtLocation(typeAlias).getText();
        const importPathMatches = /import\("([^"]+)"\)\.(\w+)/.exec(
          propertyType,
        );
        if (!importPathMatches) {
          // console.warn(`Failed to get import path for ${item} by ${filePath}`);
          return "";
        }

        const [, importPath, importItem] = importPathMatches;
        this.updateImports(importPath, importItem);
        this.readTSData(importPath, importItem);
        // return [importPath, importItem];
      });
  }

  static fixPackageExport(exports: string) {
    return exports
      .replace(/^\./, "")
      .replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&")
      .replace("*", "(.*)");
  }

  private getImportedContent(filePath: string) {
    const content = this.imports.get(filePath);
    return content
      ? Array.from(content.values())
          .sort((first, second) => {
            const secondName = /(export)?\s+type\s+([^=]+)\s*=/.exec(
              second,
            )?.[2];
            if (!secondName) {
              return 0;
            }

            if (first.includes(secondName)) {
              return 1;
            }

            return -1;
          })
          .join("\n")
      : "";
  }

  private async getImportFromPackage(packageName: string, data: ImportData) {
    if (data.type !== "some") {
      throw new Error("Not implemented");
    }

    const packagePath = path.resolve(this.root, "node_modules", packageName);
    const packageJSONContent = await fs.readFile(
      path.join(packagePath, "package.json"),
      { encoding: "utf8" },
    );
    const packageJSON = JSON.parse(packageJSONContent);
    const { exports = {} } = packageJSON;

    const usefulExports = Object.entries(exports).map(([key, value]) => {
      const clearKey = GenX.fixPackageExport(key);
      const keyRe = new RegExp(`^${clearKey}$`);

      return [key, { regex: keyRe, paths: value }] as {
        regex: RegExp;
        paths: {
          require: string;
          import: string;
          types: string;
        };
      }[];
    });

    const relativeFromPath = data.from.replace(packageName, "");
    const matchedExport = usefulExports.find(([, value]) =>
      value.regex.test(relativeFromPath),
    );
    if (!matchedExport) {
      throw new Error(`Not found export from ${data.from}`);
    }

    const exportParts = matchedExport[1].regex.exec(relativeFromPath)?.slice(1);
    let typeFilePath = matchedExport[1].paths.types;
    while (exportParts?.length && typeFilePath.includes("*")) {
      typeFilePath = typeFilePath.replace("*", exportParts.shift()!);
    }

    const newFilePath = path.join(packagePath, typeFilePath);
    data.items.map((item) => {
      this.readTSData(newFilePath, item.content);
    });

    return this.getImportedContent(newFilePath);
  }

  private async getImportFromProject(filePath: string, data: ImportData) {
    if (data.type !== "some") {
      throw new Error("Not implemented yet");
    }

    const dataPath = path.resolve(
      filePath,
      filePath.endsWith(".ts") ? ".." : "",
      data.from,
    );

    const newFilePath = GenX.calcFilePath(dataPath);
    data.items.map((item) => {
      this.readTSData(newFilePath, item.content);
    });

    return this.getImportedContent(newFilePath);
  }

  static parseImportLine(importLine: string): ImportData {
    const matches = importRegex.exec(importLine);
    if (!matches) {
      throw new Error("Invalid import statement");
    }

    const [, , allAsType, contentValue, , allWithAlias, defaultContent, from] =
      matches as unknown as ImportMatches;

    if (defaultContent) {
      return {
        type: "default",
        alias: defaultContent.trim(),
        from,
      };
    }

    if (allWithAlias) {
      return {
        type: "all",
        alias: allWithAlias.trim(),
        from,
      };
    }

    if (!contentValue) {
      throw new Error("Unknown import line matches");
    }

    return {
      type: "some",
      items: contentValue
        .trim()
        .split(",")
        .map<ImportSomeItem>((part) => {
          const item = part.trim();
          const alias = /\s+as\s+(\w+)/.exec(item);
          const isType = allAsType ? true : item.startsWith("type ");
          const partWithoutType = !allAsType
            ? item.replace(/type\s+/, "")
            : item;
          const content = alias
            ? partWithoutType.replace(alias[0], "")
            : partWithoutType;
          return {
            isType,
            alias: alias ? alias[1] : "",
            content,
          };
        }),
      from,
    };
  }

  /**
   * Clear saved depends and imports
   */
  clearData() {
    this.rootDepends.clear();
    this.imports.clear();
    return this;
  }

  async getImportContent(importLine: string, filePath = "") {
    try {
      const data = GenX.parseImportLine(importLine);
      const depends = await this.getRootDepends();
      const packageName = depends
        .keys()
        .find((depend) => data.from.startsWith(depend));
      if (packageName) {
        return await this.getImportFromPackage(packageName, data);
      }

      if (!this.includeNearbyFiles || !filePath) {
        console.warn("Include nearby files disabled");
        return "";
      }

      return await this.getImportFromProject(filePath, data);
    } catch (err) {
      console.error(
        `Failed to get import content, because ${(err as Error).message}`,
      );
      return "";
    }
  }

  /**
   * Generate Typebox code by string
   */
  async generateByCode(code: string, filePath = "") {
    const imports = Array.from(code.matchAll(new RegExp(importRegex, "g")));
    const inlineImports = [];
    for await (const importLine of imports) {
      const importContent = await this.getImportContent(
        importLine[0],
        filePath,
      );
      if (!importContent) {
        inlineImports.push(importLine[0]);
      }

      code = `${importContent}${code.replace(importLine[0], "")}`;
    }

    const typeboxCode = Codegen.TypeScriptToTypeBox.Generate(code);
    const importLines = inlineImports.join("\n");
    return importLines ? `${importLines}\n\n${typeboxCode}` : typeboxCode;
  }

  /**
   * Generate Typebox code by file
   */
  async generateByFile(filePath: string) {
    const content = await fs.readFile(filePath, { encoding: "utf8" });
    return await this.generateByCode(content, filePath);
  }

  /**
   * Generate Typebox code by read files from input dir and write result to output dir
   */
  async generateByDir(inputPath: string, outputPath: string) {
    const inputDir = path.resolve(this.root, inputPath);
    const outputDir = path.resolve(this.root, outputPath);

    const files = (await fs.readdir(inputDir)).filter((file) =>
      file.endsWith(".ts"),
    );
    for await (const file of files) {
      const filePath = path.resolve(inputDir, file);
      const typeboxCode = await this.generateByFile(filePath);

      await fs.writeFile(path.resolve(outputDir, file), typeboxCode);
    }

    return true;
  }
}
