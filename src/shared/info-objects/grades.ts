export interface GradesHeader {
 assignmentName: string;
 gradeType: string;
}

export enum SubmissionType {
  STUDENT ,
  GROUP
}

export interface GradesCSV<T extends Grade> {
  header: GradesHeader;
  submissionType: SubmissionType;
  studentGrades: T[];
}

/**
 * An object representing a grade, it has to be
 * an instance of either <code>StudentGrade</code> or <code>GroupGrade</code>.
 */
interface Grade {
  id: string;
  submissionType : SubmissionType;
  grade: number;
  submissionDate: string;
  lateSubmission: string;
}

/**
 * A grade representing a student's submission.
 */
export interface StudentGrade extends Grade{
  displayId: string;
  lastName: string;
  firstName: string;
}

/**
 * A Grade representing a Group Submission
 */
export interface GroupGrade extends Grade{
  name: string;
  users: string[];
}
