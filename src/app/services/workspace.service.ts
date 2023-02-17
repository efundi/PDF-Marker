import {Injectable} from '@angular/core';
import {first, map, Observable, ReplaySubject, tap, throwError} from 'rxjs';
import {WorkspaceIpcService} from '@shared/ipc/workspace.ipc-service';
import {fromIpcResponse} from './ipc.utils';
import {Workspace} from '@shared/info-objects/workspace';
import {SelectedSubmission} from '../info-objects/selected-submission';
import {catchError} from 'rxjs/operators';
import {find, isNil} from 'lodash';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';
import {AppService} from './app.service';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  private workspaceApi: WorkspaceIpcService;


  public readonly workspaceList = new ReplaySubject<Workspace[]>(1);
  workspaceListLoading = new ReplaySubject<boolean>(1);

  constructor(private appService: AppService) {
    this.workspaceApi = (window as any).workspaceApi;

    this.refreshWorkspaces().subscribe();
  }


  /**
   * Refresh workspaces from cache
   */
  refreshWorkspaces(): Observable<Workspace[]> {
    this.workspaceListLoading.next(true);
    return fromIpcResponse(this.workspaceApi.getAssignments())
      .pipe(
        catchError((error) => {

          this.appService.openSnackBar(false, 'Could not refresh list. ' + error);
          this.workspaceList.next([]);
          this.workspaceListLoading.next(false);
          return throwError(() => error);
        }),
        tap((workspaces) => {
          this.workspaceList.next(workspaces);
          this.workspaceListLoading.next(false);
        })
      );
  }



  getWorkspaceHierarchy(workspaceName: string): Observable<Workspace> {
    if (isNil(workspaceName)) {
      workspaceName = DEFAULT_WORKSPACE;
    }
    return this.workspaceList.pipe(
      first(),
      map((workspaces) => {
        return find(workspaces, {name: workspaceName});
      })
    );
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
