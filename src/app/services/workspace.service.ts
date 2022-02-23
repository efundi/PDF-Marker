import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {WorkspaceDialogResult} from '../components/assignment-workspace-manage-modal/assignment-workspace-manage-modal.component';
import {WorkspaceServiceIpc} from '@shared/ipc/workspace-service-ipc';
import {fromIpcResponse} from './ipc.utils';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  private dialogResultSource = new Subject<WorkspaceDialogResult>();

  dialogResultSource$ = this.dialogResultSource.asObservable();

  private workspaceApi: WorkspaceServiceIpc;

  constructor() {
    this.workspaceApi = (window as any).workspaceApi;
  }

  announceWorkspaceChanges(workspaceModal: WorkspaceDialogResult) {
    this.dialogResultSource.next(workspaceModal);
  }

  createWorkingFolder(folderName: string): Observable<string> {
    return fromIpcResponse(this.workspaceApi.createWorkingFolder(folderName));
  }

  deleteWorkspace(workingFolder: string): Observable<string[]> {
    return fromIpcResponse(this.workspaceApi.deleteWorkspace(workingFolder));
  }

  deleteWorkspaceCheck(workingFolder: string): Observable<boolean> {
    return fromIpcResponse(this.workspaceApi.deleteWorkspaceCheck(workingFolder));
  }

  getWorkspaces(): Observable<string[]> {
    return fromIpcResponse(this.workspaceApi.getWorkspaces());
  }

  updateWorkspaceName(workspaceName: string, newWorkspaceName: string): Observable<string> {
    return fromIpcResponse(this.workspaceApi.updateWorkspaceName(workspaceName, newWorkspaceName));
  }

  moveWorkspaceAssignments(workspaceName: string, newWorkspaceName: string, selectedAssignments: any[]): Observable<any> {
    return fromIpcResponse(this.workspaceApi.moveWorkspaceAssignments(workspaceName, newWorkspaceName, selectedAssignments));
  }
}
