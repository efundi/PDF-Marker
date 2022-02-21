export interface UpdateAssignment {
  assignmentName?: string;
  studentDetails?: UpdateAssignmentStudentDetails[];
  files?: string[];
  workspace?: string;
}


export interface UpdateAssignmentStudentDetails{
  studentId?: string;
  studentName?: string;
  studentSurname?: string;
  remove?: boolean;
}
