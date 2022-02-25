import {UpdateAssignment} from '../info-objects/update-assignment';
import {CreateAssignmentInfo} from '../info-objects/create-assignment.info';
import {ShareAssignments} from '../info-objects/share-assignments';
import {IRubric} from '../info-objects/rubric.class';
import {IpcResponse} from './ipc-response';

export interface AssignmentIpcService {

  getAssignments(): Promise<IpcResponse<any>>;
  createAssignment(createAssignmentInfo: CreateAssignmentInfo): Promise<IpcResponse<any>>;
  updateAssignment(updateRequest: UpdateAssignment): Promise<IpcResponse<any>>;
  saveMarks(location: string, marks: any[], totalMarks: any): Promise<IpcResponse<any>>;
  saveRubricMarks(location: string, rubricName: string, marks: any[]): Promise<IpcResponse<any>>;
  finalizeAssignment(workspaceFolder: string, assignmentName: string): Promise<IpcResponse<Uint8Array>>;
  finalizeAssignmentRubric(workspaceFolder: string, assignmentName: string, rubricName: string): Promise<IpcResponse<Uint8Array>>;
  getAssignmentSettings(workspaceName: string, location: string): Promise<IpcResponse<any>>;
  getAssignmentGlobalSettings(location: string): Promise<IpcResponse<any>>;
  getMarks(workspaceName: string, assignmentName: string): Promise<IpcResponse<any>>;
  getGrades(workspaceName: string, assignmentName: string): Promise<IpcResponse<any>>;
  updateAssignmentSettings(updatedSettings: any, workspaceName: string, assignmentName: string): Promise<IpcResponse<any>>;
  shareExport(shareRequest: ShareAssignments): Promise<IpcResponse<any>>;
  rubricUpdate(rubricName: string, assignmentName: string): Promise<IpcResponse<IRubric>>;
  getMarkedAssignmentsCount(workspaceName: string, assignmentName): Promise<IpcResponse<number>>;
  getPdfFile(location: string): Promise<IpcResponse<Uint8Array>>;
}
