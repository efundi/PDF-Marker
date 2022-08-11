export interface GradesHeader {
 assignmentName: string;
 gradeType: string;
}

export interface GradesCSV {
  header: GradesHeader;
  studentGrades: StudentGrade[];
}

export interface StudentGrade{
  displayId: string;
  id: string;
  lastName: string;
  firstName: string;
  grade: number;
  submissionDate: string;
  lateSubmission: string;
}
