import type { ExportItem } from "./utils";

export type ImportMatches = [
  plain: string,
  // full content matched part
  fullContent: string,
  // contain "type" with spaces or without spaces
  allAsType: string | undefined,
  // content string
  contentValue: string | undefined,
  // full matched part
  fullAllWithAlias: string | undefined,
  // alias for import all content
  allWithAlias: string | undefined,
  // default import
  defaultContent: string | undefined,
  from: string,
];

export type ImportContentType = "default" | "all" | "some";

export type ImportDefaultData = {
  type: "default";
  alias: string;
  from: string;
};

export type ImportAllData = {
  type: "all";
  alias: string;
  from: string;
};

export type ImportSomeItem = {
  /**
   * false doesn't guarantee that it isn't a type
   *
   * Reflects only whether it is an explicit type
   */
  isType: boolean;
  content: string;
  alias: string;
};

export type ImportSomeData = {
  type: "some";
  items: ImportSomeItem[];
  from: string;
};

export type ImportData = ImportDefaultData | ImportAllData | ImportSomeData;

export type GenXOpts = {
  root: string;
  includeNearbyFiles?: boolean;
  workspaceRoot?: string;
};

export type PackageExport = {
  regex: RegExp;
  paths: ExportItem;
};
