export enum ZipFileType {
  /**
   * An import for a marker
   */
  MARKER_IMPORT,
  ASSIGNMENT_IMPORT,
  GENERIC_IMPORT,
  MOODLE_IMPORT,
}

export interface AssignmentValidateResultInfo {
  zipFileType: ZipFileType;
  hasRubric: boolean;
}
