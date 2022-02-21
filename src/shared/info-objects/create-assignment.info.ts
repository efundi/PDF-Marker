export interface CreateAssignmentInfo {
  workspace: string;
  assignmentName: string;
  noRubric: boolean;
  rubric: string;
  studentRow?: StudentInfo[];
  files: string[];
}

export interface StudentInfo {
  studentId: string;
  studentName: string;
  studentSurname: string;
  studentSubmission: File;
  studentSubmissionText: string;
}
