
export enum ExportFormat {
  PDFM,
  MODERATION
}

export interface ExportAssignmentsRequest {

  format: ExportFormat;

  /**
   * Name of the workspace in which the assignment is.
   * Null if default workspace
   */
  workspaceFolder: string | null;

  /**
   * Name of the assignment
   */
  assignmentName: string;

  /**
   * Submissions to share
   * If the value is null, all submissions will be exported
   */
  studentIds: string[];

  /**
   * Path to the zip file containing the export
   */
  zipFilePath: string;
}
