export type ExportItem = {
  require?: string;
  import?: string;
  types?: string;
};

export type PackageJson = {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  module?: string;
  types?: string;
  exports?: Record<string, ExportItem>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  workspaces?: string[];
};
