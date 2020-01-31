export interface CreateAssignmentInfo {
  assignmentName: string;
  noRubric: boolean;
  rubric: string;
  studentRow?: StudentInfo[]
}

interface StudentInfo {
  studentId: string | number;
  studentName: string;
  studentSurname: string;
  studentSubmission: File;
  studentSubmissionText: string;
}
