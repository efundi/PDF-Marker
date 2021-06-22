import {Inject, Injectable, Optional, PLATFORM_ID} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {AppService} from '@coreModule/services/app.service';
import {Observable, Subject} from 'rxjs';
import {MimeTypesEnum} from '@coreModule/utils/mime.types.enum';
import {WorkspaceDialogResult} from '@pdfMarkerModule/components/assignment-workspace-manage-modal/assignment-workspace-manage-modal.component';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {


  private dialogResultSource = new Subject<WorkspaceDialogResult>();
  dialogResultSource$ = this.dialogResultSource.asObservable();


  constructor(private http: HttpClient,
              @Inject(PLATFORM_ID) private platformId: any,
              private appService: AppService) {
  }

  announceWorkspaceChanges(workspaceModal: WorkspaceDialogResult) {
    this.dialogResultSource.next(workspaceModal);
  }

  getWorkspaces(): Observable<any> {
    const body = {
    };
    const headers = new HttpHeaders({
      'Content-Type': MimeTypesEnum.JSON,
      'Accept': MimeTypesEnum.JSON
    });
    return this.http.post<string[]>("/api/workspaces", body);
  }

  // getWorkspaces(): Observable<string[]> {
  //   return this.http.get<string[]>('/api/workspaces');
  // }

  updateWorkspaceName(workspaceName: string, newWorkspaceName: string): Observable<string> {
    const body = {
      workspaceName: workspaceName,
      newWorkspaceName: newWorkspaceName
    };
    return this.http.post<string>("/api/workspace/update", body);
  }

  moveWorkspaceAssignments(workspaceName: string, newWorkspaceName: string, selectedAssignments: any[]) {
    const body = {
      currentWorkspaceName: workspaceName,
      workspaceName: newWorkspaceName,
      assignments: selectedAssignments
    };
    return this.http.post("/api/workspace/move", body);
  }
}
