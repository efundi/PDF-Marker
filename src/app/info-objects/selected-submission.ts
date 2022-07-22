import {Workspace, WorkspaceAssignment, WorkspaceFile} from '@shared/info-objects/workspace';

export interface SelectedSubmission {
  workspace: Workspace;
  assignment: WorkspaceAssignment;
  pdfFile: WorkspaceFile;
}
