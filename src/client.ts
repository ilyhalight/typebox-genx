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
  PackageExport,
} from "./types/client";
import type { PackageJson } from "./types/utils";

export const importRegex =
  /import\s*((type\s*)?\{([^}]+)\}|(\*\s*as\s+(\w+))|(\w+))\s*from\s*["']([^"']+)["']/;

export default class GenX {
  root: string;
  includeNearbyFiles: boolean;
  workspaceRoot?: string;

  rootDepends = new Map<string, string>();
  imports = new Map<string, Map<string, string>>();

  constructor({
    root,
    includeNearbyFiles = false,
    workspaceRoot = undefined,
  }: GenXOpts) {
    this.root = root;
    this.includeNearbyFiles = includeNearbyFiles;
    this.workspaceRoot = workspaceRoot;
  }

  private async getPackageJson(root: string) {
    try {
      const content = await fs.readFile(path.resolve(root, "package.json"), {
        encoding: "utf8",
      });
      return JSON.parse(content) as PackageJson;
    } catch (err) {
      console.error("Failed to read package.json", (err as Error).message);
      return {};
    }
  }

  private async getRootDepends() {
    if (this.rootDepends.size !== 0) {
      return this.rootDepends;
    }

    const packageJSON = await this.getPackageJson(this.root);
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
    const oldImports =
      this.imports.get(importPath) ?? new Map<string, string>();
    this.imports.set(
      importPath,
      oldImports.set(item, this.readTypeAliasContent(importPath, item)),
    );
    return true;
  }

  private readTSData(filePath: string, item: string) {
    const items = this.imports.get(GenX.calcFilePath(filePath));
    if (items?.has(item)) {
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
      .replaceAll("*", "(.*)");
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

  private exportToRegex(path: string) {
    const clearKey = GenX.fixPackageExport(path);
    return new RegExp(`^${clearKey}$`);
  }

  private async getImportFromPackage(
    packageName: string,
    data: ImportData,
    root: string = this.root,
  ) {
    if (data.type !== "some") {
      throw new Error("Not implemented");
    }

    const packagePath = path.resolve(root, "node_modules", packageName);
    const {
      exports = {},
      main,
      module,
      types,
    } = await this.getPackageJson(packagePath);
    const usefulExports = Object.entries(exports).map<[string, PackageExport]>(
      ([key, value]) => {
        const regex = this.exportToRegex(key);
        return [key, { regex, paths: value }];
      },
    );
    if (
      !usefulExports.find(([exportName]) => exportName === ".") &&
      (main || module || types)
    ) {
      usefulExports.push([
        ".",
        {
          regex: this.exportToRegex("."),
          paths: {
            import: module,
            require: main,
            types,
          },
        },
      ]);
    }

    const relativeFromPath = data.from.replace(packageName, "");
    const matchedExport = usefulExports.find(([, value]) =>
      value.regex.test(relativeFromPath),
    );
    if (!matchedExport) {
      throw new Error(`Not found export from ${data.from}`);
    }

    const exportParts = matchedExport[1].regex.exec(relativeFromPath)?.slice(1);
    let typeFilePath = matchedExport[1].paths.types;
    if (!typeFilePath) {
      throw new Error(`Not found type file for ${matchedExport[0]} export`);
    }

    while (exportParts?.length && typeFilePath.includes("*")) {
      typeFilePath = typeFilePath.replace("*", exportParts.shift()!);
    }

    const newFilePath = path.join(packagePath, typeFilePath);
    data.items.map((item) => {
      this.readTSData(newFilePath, item.content);
    });

    return this.getImportedContent(newFilePath);
  }

  private getImportFromProject(filePath: string, data: ImportData) {
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
      if (
        this.workspaceRoot &&
        packageName &&
        depends.get(packageName)?.startsWith("workspace")
      ) {
        return await this.getImportFromPackage(
          packageName,
          data,
          this.workspaceRoot,
        );
      } else if (packageName) {
        return await this.getImportFromPackage(packageName, data, this.root);
      }

      if (!this.includeNearbyFiles || !filePath) {
        console.warn("Include nearby files disabled");
        return "";
      }

      return this.getImportFromProject(filePath, data);
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
    for (const importLine of imports) {
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
    for (const file of files) {
      const filePath = path.resolve(inputDir, file);
      const typeboxCode = await this.generateByFile(filePath);

      await fs.writeFile(path.resolve(outputDir, file), typeboxCode);
    }

    return true;
  }
}
