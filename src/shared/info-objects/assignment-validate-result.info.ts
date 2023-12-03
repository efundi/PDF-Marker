export enum ZipFileType {
  /**
   * An import for a marker
   */
  MARKER_IMPORT,
  ASSIGNMENT_IMPORT,
  GROUP_ASSIGNMENT_IMPORT,
  GENERIC_IMPORT
}

export interface AssignmentValidateResultInfo {
  zipFileType: ZipFileType;
  hasRubric: boolean;
}
