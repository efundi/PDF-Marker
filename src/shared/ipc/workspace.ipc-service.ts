import {IpcResponse} from './ipc-response';
import {WorkspaceTreeNode} from '@shared/info-objects/workspaceTreeNode';

export interface WorkspaceIpcService {
  getAssignments(): Promise<IpcResponse<WorkspaceTreeNode[]>>;
  createWorkingFolder(name: string): Promise<IpcResponse<string>>;
  updateWorkspaceName(workspaceName: string, newWorkspaceName: string): Promise<IpcResponse<string>>;
  moveWorkspaceAssignments(currentWorkspaceName: string, workspaceName: string, assignments: any[]): Promise<IpcResponse<any>>;
  getWorkspaces(): Promise<IpcResponse<string[]>>;
  deleteWorkspace(deleteFolder: string): Promise<IpcResponse<string[]>>;
  deleteWorkspaceCheck(deleteFolder: string): Promise<IpcResponse<boolean>>;
}
