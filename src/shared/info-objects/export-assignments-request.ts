
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
   */
  studentIds: string[];
}
