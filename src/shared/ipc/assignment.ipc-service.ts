import {AssignmentInfo} from '../info-objects/assignment.info';
import {ExportAssignmentsRequest} from '../info-objects/export-assignments-request';
import {IRubric} from '../info-objects/rubric.class';
import {IpcResponse} from './ipc-response';
import {SubmissionInfo} from '@shared/info-objects/submission.info';

export interface AssignmentIpcService {


  createAssignment(createAssignmentInfo: AssignmentInfo): Promise<IpcResponse<any>>;
  updateAssignment(updateRequest: AssignmentInfo): Promise<IpcResponse<any>>;
  saveMarks(workspaceName: string, assignmentName: string, studentId: string, marks: SubmissionInfo): Promise<IpcResponse<any>>;
  finalizeAssignment(workspaceFolder: string, assignmentName: string, zipFilePath: string): Promise<IpcResponse<string>>;
  getAssignmentSettings(workspaceName: string, location: string): Promise<IpcResponse<any>>;
  getMarks(workspaceName: string, assignmentName: string, studentId: string): Promise<IpcResponse<SubmissionInfo>>;
  updateAssignmentSettings(updatedSettings: any, workspaceName: string, assignmentName: string): Promise<IpcResponse<any>>;
  exportAssignment(exportAssignmentsRequest: ExportAssignmentsRequest): Promise<IpcResponse<string>>;
  updateAssignmentRubric(workspaceName: string, assignmentName: string, rubricName: string): Promise<IpcResponse<IRubric>>;
  getPdfFile(location: string): Promise<IpcResponse<Uint8Array>>;
  generateAllocationZipFiles(workspaceName: string, assignmentName: string, exportPath: string): Promise<IpcResponse<string>>;
  isMarkerAllocated(markerId: string): Promise<IpcResponse<boolean>>;

}
