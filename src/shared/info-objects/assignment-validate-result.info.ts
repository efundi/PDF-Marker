export enum ZipFileType {
  MARKER_IMPORT,
  ASSIGNMENT_IMPORT,
  GENERIC_IMPORT
}

export interface AssignmentValidateResultInfo {
  zipFileType: ZipFileType;
  hasRubric: boolean;
}
