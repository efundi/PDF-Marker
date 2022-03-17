import {Injectable} from '@angular/core';
import {first, map, mergeMap, Observable, ReplaySubject, tap, throwError} from 'rxjs';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {ShareAssignments} from '@shared/info-objects/share-assignments';
import {AssignmentIpcService} from '@shared/ipc/assignment.ipc-service';
import {UpdateAssignment} from '@shared/info-objects/update-assignment';
import {CreateAssignmentInfo} from '@shared/info-objects/create-assignment.info';
import {IRubric} from '@shared/info-objects/rubric.class';
import {fromIpcResponse} from './ipc.utils';
import {find, isNil} from 'lodash';
import {SelectedSubmission} from '../info-objects/selected-submission';
import {findTreeNode, StudentSubmission, TreeNodeType, Workspace, WorkspaceAssignment, WorkspaceFile} from '@shared/info-objects/workspace';
import {DEFAULT_WORKSPACE, MARK_FILE} from '@shared/constants/constants';
import {SubmissionInfo} from '@shared/info-objects/submission.info';
import {catchError} from 'rxjs/operators';
import {AppService} from './app.service';

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {

  workspaceList = new ReplaySubject<Workspace[]>(1);
  workspaceListLoading = new ReplaySubject<boolean>(1);
  private selectedSubmission = new ReplaySubject<SelectedSubmission>(1);
  selectedSubmissionChanged: Observable<SelectedSubmission>;

  private assignmentApi: AssignmentIpcService;

  constructor(private appService: AppService) {

    this.assignmentApi = (window as any).assignmentApi;
    this.selectedSubmissionChanged = this.selectedSubmission.asObservable();
    this.refreshWorkspaces().subscribe();
  }

  selectSubmission(selectedSubmission: SelectedSubmission): void {
    this.selectedSubmission.next(selectedSubmission);
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

  getAssignmentHierarchy(workspaceName: string, assignmentName: string): Observable<WorkspaceAssignment> {
    return this.getWorkspaceHierarchy(workspaceName)
      .pipe(
        map((workspace) => {
          if (isNil(workspace)) {
            return null;
          }
          return find(workspace.children, {name: assignmentName});
        })
      );
  }

  /**
   * Refresh workspaces from cache
   */
  refreshWorkspaces(): Observable<Workspace[]> {
    this.workspaceListLoading.next(true);
    return fromIpcResponse(this.assignmentApi.getAssignments())
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

  updateAssignmentSettings(updatedSettings: AssignmentSettingsInfo, workspaceName: string, assignmentName: string): Observable<any> {
    return fromIpcResponse(this.assignmentApi.updateAssignmentSettings(updatedSettings, workspaceName, assignmentName));
  }

  getAssignmentSettings(workspaceName: string, assignmentName: string ): Observable<AssignmentSettingsInfo> {
    return fromIpcResponse(this.assignmentApi.getAssignmentSettings(workspaceName, assignmentName));
  }

  getAssignmentGrades(workspaceName: string, assignmentName: string): Observable<any> {
    return fromIpcResponse(this.assignmentApi.getGrades(workspaceName, assignmentName));
  }

  getFile(pdfFileLocation: string): Observable<Uint8Array> {
    return fromIpcResponse(this.assignmentApi.getPdfFile(pdfFileLocation));
  }

  private removeMarksFile(workspaceName: string, assignmentName: string): Observable<any>{
    return this.getAssignmentHierarchy(workspaceName, assignmentName).pipe(
      tap(workspaceAssignment => {
        workspaceAssignment.children.forEach((f, submissionIndex) => {
          if (f.type === TreeNodeType.SUBMISSION) {
            const index = f.children.findIndex(file => file.type === TreeNodeType.FILE && file.name === MARK_FILE);
            if (index > -1) {
              workspaceAssignment.children[submissionIndex].children.splice(index, 1);
            }
          }
        });
      })
    );
  }

  private updateMarksFileTimestamp(workspace: string, location: string): Observable<any> {
      return this.workspaceList.pipe(
        first(),
        tap((workspaces) => {

          if (!location.startsWith(workspace)) {
            location = workspace + '/' + location;
          }
          const studentSubmission: StudentSubmission = findTreeNode(location, workspaces) as StudentSubmission;
          let marksFile: WorkspaceFile = studentSubmission.children.find(c => c.name === MARK_FILE) as WorkspaceFile;
          if (isNil(marksFile)) {
            marksFile = {
              type: TreeNodeType.FILE,
              children: [],
              name: MARK_FILE,
              dateModified: new Date()
            };
            studentSubmission.children.push(marksFile);
          } else {
            marksFile.dateModified = new Date();
          }
        })
      );
  }

  saveMarks(workspace: string, location: string, marks: SubmissionInfo): Observable<any> {
    return fromIpcResponse(this.assignmentApi.saveMarks(location, marks))
      .pipe(
        mergeMap((response) => {
          // After saving the marks we need to update the workspace list to contain the new modified date
          return this.updateMarksFileTimestamp(workspace, location)
            .pipe(map(() => response));
        }),
      );
  }

  getSavedMarks(location: string): Observable<SubmissionInfo> {
    return fromIpcResponse(this.assignmentApi.getMarks(location));
  }

  shareExport(shareRequest: ShareAssignments): Observable<Uint8Array> {
    return fromIpcResponse(this.assignmentApi.shareExport(shareRequest));
  }

  finalizeAndExport(workspaceName: string = null, assignmentName: string): Observable<Uint8Array> {
    return fromIpcResponse(this.assignmentApi.finalizeAssignment(workspaceName, assignmentName));
  }

  finalizeAndExportRubric(workspaceName: string, assignmentName: string, assignmentRubric: IRubric): Observable<Uint8Array> {
    return fromIpcResponse(this.assignmentApi.finalizeAssignmentRubric(workspaceName, assignmentName, assignmentRubric.name));
  }

  createAssignment(createAssignmentInfo: CreateAssignmentInfo): Observable<any> {
    return fromIpcResponse(this.assignmentApi.createAssignment(createAssignmentInfo));
  }

  updateAssignment(updateAssignmentInfo: UpdateAssignment): Observable<any> {
    return fromIpcResponse(this.assignmentApi.updateAssignment(updateAssignmentInfo));
  }

  updateAssignmentRubric(workspaceName: string, assignmentName: string, rubricName: string): Observable<IRubric> {
    return fromIpcResponse(this.assignmentApi.updateAssignmentRubric(workspaceName, assignmentName, rubricName))
      .pipe(
        mergeMap((response) => {
          return this.removeMarksFile(workspaceName, assignmentName)
            .pipe(map(() => response));
        })
      );
  }

  getMarkedAssignmentsCount(workspaceName: string, assignmentName): Observable<number> {
    return fromIpcResponse(this.assignmentApi.getMarkedAssignmentsCount(workspaceName, assignmentName));
  }
}
