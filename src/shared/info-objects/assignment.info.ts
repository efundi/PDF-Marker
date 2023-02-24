export interface AssignmentInfo {
  workspace: string;
  assignmentName: string;
  rubric: string;
  submissions?: AssignmentSubmissionInfo[];
}

export interface AssignmentSubmissionInfo {
  studentId: string;
  studentName: string;
  studentSurname: string;
  submissionFilePath: string;
}
