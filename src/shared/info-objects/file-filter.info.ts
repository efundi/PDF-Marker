export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface SaveFileInfo {
  filename: string;
  filters: FileFilter[];
  buffer?: string | ArrayBuffer;
}

export interface OpenFileInfo {
  filters: FileFilter[];
}
