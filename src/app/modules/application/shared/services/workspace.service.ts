import {Inject, Injectable, Optional, PLATFORM_ID} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {AppService} from '@coreModule/services/app.service';
import {Observable} from 'rxjs';
import {MimeTypesEnum} from '@coreModule/utils/mime.types.enum';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  constructor(private http: HttpClient,
              @Optional() @Inject('ASSIGNMENT_LIST') private assignmentList: (callback) => void,
              @Inject(PLATFORM_ID) private platformId: any,
              private appService: AppService) {
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
