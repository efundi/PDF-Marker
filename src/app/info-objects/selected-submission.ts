import {WorkspaceTreeNode, AssignmentTreeNode, WorkspaceFileTreeNode} from '@shared/info-objects/workspaceTreeNode';

export interface SelectedSubmission {
  workspace: WorkspaceTreeNode;
  assignment: AssignmentTreeNode;
  pdfFile: WorkspaceFileTreeNode;
}
