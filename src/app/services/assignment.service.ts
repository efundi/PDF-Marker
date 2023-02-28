import {EventEmitter, Injectable} from '@angular/core';
import {first, forkJoin, map, mergeMap, Observable, ReplaySubject, tap} from 'rxjs';
import {AssignmentSettingsInfo, Submission} from '@shared/info-objects/assignment-settings.info';
import {ExportAssignmentsRequest} from '@shared/info-objects/export-assignments-request';
import {AssignmentIpcService} from '@shared/ipc/assignment.ipc-service';
import {AssignmentInfo} from '@shared/info-objects/assignment.info';
import {IRubric} from '@shared/info-objects/rubric.class';
import {fromIpcResponse} from './ipc.utils';
import {find, isNil} from 'lodash';
import {SelectedSubmission} from '../info-objects/selected-submission';
import {
  findTreeNode,
  StudentSubmissionTreeNode,
  TreeNodeType, WorkspaceTreeNode,
  AssignmentTreeNode,
  WorkspaceFileTreeNode
} from '@shared/info-objects/workspaceTreeNode';
import {MARK_FILE} from '@shared/constants/constants';
import {SubmissionInfo} from '@shared/info-objects/submission.info';
import {AppService} from './app.service';
import {WorkspaceService} from './workspace.service';

export interface SubmissionUpdatedEvent {
  workspaceName: string;
  assignmentName: string;
  studentId: string;

  submission: SubmissionInfo;
}

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {

  private selectedSubmission = new ReplaySubject<SelectedSubmission>(1);
  selectedSubmissionChanged: Observable<SelectedSubmission>;

  submissionUpdated = new EventEmitter<SubmissionUpdatedEvent>();

  private assignmentApi: AssignmentIpcService;

  constructor(private appService: AppService,
              private workspaceService: WorkspaceService) {

    this.assignmentApi = (window as any).assignmentApi;
    this.selectedSubmissionChanged = this.selectedSubmission.asObservable();
  }

  selectSubmission(selectedSubmission: SelectedSubmission): void {
    this.selectedSubmission.next(selectedSubmission);
  }

  getAssignmentHierarchy(workspaceName: string, assignmentName: string): Observable<AssignmentTreeNode> {
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

  private updateMarksFileTimestamp(workspaceName: string, assignmentName: string, studentId: string): Observable<any> {
    const workspacesObservable = this.workspaceService.workspaceList.pipe(first());


      return forkJoin([
        workspacesObservable,
        this.getAssignmentSettings(workspaceName, assignmentName)
      ]).pipe(
        tap(([workspaces, assignmentSettings]) => {

          const location = `${workspaceName}/${assignmentName}`;
          const assignmentNode = findTreeNode(location, workspaces) as AssignmentTreeNode;
          const assignmentSubmission: Submission = find(assignmentSettings.submissions, (s) => s.studentId === studentId);

          const studentSubmission: StudentSubmissionTreeNode = find(assignmentNode.children, (n) => {
            return n.name === assignmentSubmission.directoryName;
          }) as StudentSubmissionTreeNode;
          let marksFile: WorkspaceFileTreeNode = studentSubmission.children.find(c => c.name === MARK_FILE) as WorkspaceFileTreeNode;
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



  saveMarks(workspaceName: string, assignmentName: string, studentId: string, marks: SubmissionInfo): Observable<any> {
    return fromIpcResponse(this.assignmentApi.saveMarks(workspaceName, assignmentName, studentId, marks))
      .pipe(
        mergeMap((response) => {
          // After saving the marks we need to update the workspace list to contain the new modified date
          return this.updateMarksFileTimestamp(workspaceName, assignmentName, studentId)
            .pipe(map(() => response));
        }),
        tap(() => {
          this.submissionUpdated.emit({
            workspaceName,
            assignmentName,
            studentId,
            submission: marks
          });
        })
      );
  }

  getSavedMarks(workspaceName: string, assignmentName: string, studentId: string): Observable<SubmissionInfo> {
    return fromIpcResponse(this.assignmentApi.getMarks(workspaceName, assignmentName, studentId));
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
