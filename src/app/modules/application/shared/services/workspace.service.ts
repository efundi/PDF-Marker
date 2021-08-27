import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, Subject} from 'rxjs';
import {MimeTypesEnum} from '@coreModule/utils/mime.types.enum';
import {WorkspaceDialogResult} from '@pdfMarkerModule/components/assignment-workspace-manage-modal/assignment-workspace-manage-modal.component';
import {SettingInfo} from '@pdfMarkerModule/info-objects/setting.info';

const API_PATH = '/api/workspace';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  private dialogResultSource = new Subject<WorkspaceDialogResult>();

  dialogResultSource$ = this.dialogResultSource.asObservable();

  constructor(private http: HttpClient) {
  }

  announceWorkspaceChanges(workspaceModal: WorkspaceDialogResult) {
    this.dialogResultSource.next(workspaceModal);
  }

  createWorkingFolder(settings: SettingInfo): Observable<any> {
    return this.http.post(`${API_PATH}/create`, settings);
  }

  deleteWorkspace(data: any): Observable<any> {
    return this.http.post<any[]>(`${API_PATH}/delete`, data);
  }

  deleteWorkspaceCheck(data: any): Observable<boolean> {
    return this.http.post<boolean>(`${API_PATH}/delete/check`, data);
  }

  getWorkspaces(): Observable<any> {
    const body = {};
    const headers = new HttpHeaders({
      'Content-Type': MimeTypesEnum.JSON,
      'Accept': MimeTypesEnum.JSON
    });
    return this.http.post<string[]>(API_PATH, body);
  }

  updateWorkspaceName(workspaceName: string, newWorkspaceName: string): Observable<string> {
    const body = {
      workspaceName: workspaceName,
      newWorkspaceName: newWorkspaceName
    };
    return this.http.post<string>(`${API_PATH}/update`, body);
  }

  moveWorkspaceAssignments(workspaceName: string, newWorkspaceName: string, selectedAssignments: any[]) {
    const body = {
      currentWorkspaceName: workspaceName,
      workspaceName: newWorkspaceName,
      assignments: selectedAssignments
    };
    return this.http.post(`${API_PATH}/move`, body);
  }
}
