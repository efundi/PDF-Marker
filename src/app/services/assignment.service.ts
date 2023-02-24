import {Injectable} from '@angular/core';
import {first, map, mergeMap, Observable, ReplaySubject, tap} from 'rxjs';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {ExportAssignmentsRequest} from '@shared/info-objects/export-assignments-request';
import {AssignmentIpcService} from '@shared/ipc/assignment.ipc-service';
import {AssignmentInfo} from '@shared/info-objects/assignment.info';
import {IRubric} from '@shared/info-objects/rubric.class';
import {fromIpcResponse} from './ipc.utils';
import {find, isNil} from 'lodash';
import {SelectedSubmission} from '../info-objects/selected-submission';
import {
  findTreeNode,
  StudentSubmission,
  TreeNodeType,
  WorkspaceAssignment,
  WorkspaceFile
} from '@shared/info-objects/workspace';
import {MARK_FILE} from '@shared/constants/constants';
import {SubmissionInfo} from '@shared/info-objects/submission.info';
import {AppService} from './app.service';
import {WorkspaceService} from './workspace.service';

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {

  private selectedSubmission = new ReplaySubject<SelectedSubmission>(1);
  selectedSubmissionChanged: Observable<SelectedSubmission>;

  private assignmentApi: AssignmentIpcService;

  constructor(private appService: AppService,
              private workspaceService: WorkspaceService) {

    this.assignmentApi = (window as any).assignmentApi;
    this.selectedSubmissionChanged = this.selectedSubmission.asObservable();
  }

  selectSubmission(selectedSubmission: SelectedSubmission): void {
    this.selectedSubmission.next(selectedSubmission);
  }

  getAssignmentHierarchy(workspaceName: string, assignmentName: string): Observable<WorkspaceAssignment> {
    return this.workspaceService.getWorkspaceHierarchy(workspaceName)
      .pipe(
        map((workspace) => {
          if (isNil(workspace)) {
            return null;
          }
          return find(workspace.children, {name: assignmentName});
        })
      );
  }


  updateAssignmentSettings(updatedSettings: AssignmentSettingsInfo, workspaceName: string, assignmentName: string): Observable<any> {
    return fromIpcResponse(this.assignmentApi.updateAssignmentSettings(updatedSettings, workspaceName, assignmentName));
  }

  getAssignmentSettings(workspaceName: string, assignmentName: string ): Observable<AssignmentSettingsInfo> {
    return fromIpcResponse(this.assignmentApi.getAssignmentSettings(workspaceName, assignmentName));
  }

  getFile(pdfFileLocation: string): Observable<Uint8Array> {
    return fromIpcResponse(this.assignmentApi.getPdfFile(pdfFileLocation));
  }

  private removeMarksFile(workspaceName: string, assignmentName: string): Observable<any> {
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
      return this.workspaceService.workspaceList.pipe(
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
              dateModified: new Date(),
              parent: studentSubmission
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

  exportAssignment(exportAssignmentsRequest: ExportAssignmentsRequest): Observable<string> {
    return fromIpcResponse(this.assignmentApi.exportAssignment(exportAssignmentsRequest));
  }

  finalizeAndExport(workspaceName: string, assignmentName: string, zipFilePath: string): Observable<string> {
    return fromIpcResponse(this.assignmentApi.finalizeAssignment(workspaceName, assignmentName, zipFilePath));
  }

  createAssignment(createAssignmentInfo: AssignmentInfo): Observable<any> {
    return fromIpcResponse(this.assignmentApi.createAssignment(createAssignmentInfo))
      .pipe(
        mergeMap((response) => {
          return this.workspaceService.refreshWorkspaces()
            .pipe(
              map(() => response)
            );
        })
      );
  }

  updateAssignment(updateAssignmentInfo: AssignmentInfo): Observable<any> {
    return fromIpcResponse(this.assignmentApi.updateAssignment(updateAssignmentInfo))
      .pipe(
        mergeMap((response) => {
          return this.workspaceService.refreshWorkspaces()
            .pipe(
              map(() => response)
            );
        })
      );
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

  generateAllocationZipFiles(workspaceName: string, assignmentName: string, exportPath: string): Observable<string> {
    return fromIpcResponse(this.assignmentApi.generateAllocationZipFiles(workspaceName, assignmentName, exportPath));
  }

  isMarkerAllocated(markerId: string): Observable<boolean> {
    return fromIpcResponse(this.assignmentApi.isMarkerAllocated(markerId));
  }



}
