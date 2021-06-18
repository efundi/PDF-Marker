import {Inject, Injectable, Optional, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {AppService} from '@coreModule/services/app.service';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  constructor(private http: HttpClient,
              @Optional() @Inject('ASSIGNMENT_LIST') private assignmentList: (callback) => void,
              @Inject(PLATFORM_ID) private platformId: any,
              private appService: AppService) {
  }

  updateWorkspaceName(workspaceName: string, newWorkspaceName: string): Observable<string> {
    const body = {
      workspaceName: workspaceName,
      newWorkspaceName: newWorkspaceName
    };
    return this.http.post<string>("/api/workspace/update", body);
  }
}
