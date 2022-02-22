export interface AppSelectedPathInfo {
  /** C:\workspace\file.txt */
  selectedPath: string;

  /** file */
  fileName?: string;

  /** file.txt */
  basename?: string;

  /** .txt */
  ext?: string;

  contents?: string;
  error?: any;
}
