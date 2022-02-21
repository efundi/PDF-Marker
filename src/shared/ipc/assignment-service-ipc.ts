import {UpdateAssignment} from '../info-objects/update-assignment';
import {CreateAssignmentInfo} from '../info-objects/create-assignment.info';

export interface AssignmentServiceIpc {

  getAssignments(): Promise<any>;
  createAssignment(createAssignmentInfo: CreateAssignmentInfo): Promise<any>;
  updateAssignment(updateRequest: UpdateAssignment): Promise<any>;
  saveMarks(location: any, marks: any[], totalMarks: any): Promise<any>;
  saveRubricMarks(location: string, rubricName: string, marks: any[]): Promise<any>;
  finalizeAssignment(workspaceFolder: string, location: string): Promise<Uint8Array>;
  finalizeAssignmentRubric(workspaceFolder: string, location: string, rubricName: string): Promise<Uint8Array>;
  getAssignmentSettings(location: string): Promise<any>;
  getAssignmentGlobalSettings(location: string): Promise<any>;
  getMarks(location: string): Promise<any>;
  getGrades(location: string): Promise<any>;
  updateAssignmentSettings(updatedSettings: any, location: string): Promise<any>;
}
