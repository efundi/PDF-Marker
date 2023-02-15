import {UpdateAssignment} from '../info-objects/update-assignment';
import {CreateAssignmentInfo} from '../info-objects/create-assignment.info';
import {ExportAssignmentsRequest} from '../info-objects/export-assignments-request';
import {IRubric} from '../info-objects/rubric.class';
import {IpcResponse} from './ipc-response';
import {Workspace} from '@shared/info-objects/workspace';
import {SubmissionInfo} from '@shared/info-objects/submission.info';

export interface AssignmentIpcService {

  getAssignments(): Promise<IpcResponse<Workspace[]>>;
  createAssignment(createAssignmentInfo: CreateAssignmentInfo): Promise<IpcResponse<any>>;
  updateAssignment(updateRequest: UpdateAssignment): Promise<IpcResponse<any>>;
  saveMarks(location: string, marks: SubmissionInfo): Promise<IpcResponse<any>>;
  finalizeAssignment(workspaceFolder: string, assignmentName: string, zipFilePath: string): Promise<IpcResponse<string>>;
  getAssignmentSettings(workspaceName: string, location: string): Promise<IpcResponse<any>>;
  getMarks(location: string): Promise<IpcResponse<SubmissionInfo>>;
  updateAssignmentSettings(updatedSettings: any, workspaceName: string, assignmentName: string): Promise<IpcResponse<any>>;
  exportAssignment(exportAssignmentsRequest: ExportAssignmentsRequest): Promise<IpcResponse<string>>;
  updateAssignmentRubric(workspaceName: string, assignmentName: string, rubricName: string): Promise<IpcResponse<IRubric>>;
  getPdfFile(location: string): Promise<IpcResponse<Uint8Array>>;
  generateAllocationZipFiles(workspaceName: string, assignmentName: string, exportPath: string): Promise<IpcResponse<string>>;
  isMarkerAllocated(markerId: string): Promise<IpcResponse<boolean>>;
  convertToPdf(workspaceName: string, assignmentName: string, filePath: string): Promise<IpcResponse<string>>;

}
