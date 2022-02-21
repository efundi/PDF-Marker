export interface ShareAssignmentSubmission {
  studentName: string;
  studentNumber: string;
}

export interface ShareAssignments {
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
  submissions: ShareAssignmentSubmission[];
}
