import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, ReplaySubject, Subject} from 'rxjs';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {Router} from '@angular/router';
import {AppService} from './app.service';
import {ZipService} from './zip.service';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {ShareAssignments} from '@shared/info-objects/share-assignments';
import {AssignmentIpcService} from '@shared/ipc/assignment.ipc-service';
import {UpdateAssignment} from '@shared/info-objects/update-assignment';
import {CreateAssignmentInfo} from '@shared/info-objects/create-assignment.info';
import {IRubric} from '@shared/info-objects/rubric.class';
import {fromIpcResponse} from './ipc.utils';
import {PdfmConstants} from '@shared/constants/pdfm.constants';
import {find, isEqual, isNil} from 'lodash';
import {SelectedSubmission} from "../info-objects/selected-submission";

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {

  private assignmentsHierarchy: any[];
  private assignmentListSource$ = new ReplaySubject<any[]>(1);
  private selectedSubmission = new ReplaySubject<SelectedSubmission>(1);
  assignmentListChanged: Observable<any[]>;
  selectedSubmissionChanged: Observable<SelectedSubmission>;

  private assignmentApi: AssignmentIpcService;

  constructor(private router: Router,
              private appService: AppService,
              private zipService: ZipService) {

    this.assignmentApi = (window as any).assignmentApi;
    this.assignmentListChanged = this.assignmentListSource$.asObservable();
    this.selectedSubmissionChanged = this.selectedSubmission.asObservable();
    this.getAssignments().subscribe(assignments => {
      this.assignmentsHierarchy = assignments;
      this.assignmentListSource$.next(assignments);
    }, error => {
    });
  }

  private findInTree(hierachy: any, key: string): any {
    return find(hierachy, (element) => element.hasOwnProperty(key));
  }

  selectSubmission(selectedSubmission: SelectedSubmission): void {
    this.selectedSubmission.next(selectedSubmission);
  }

  getWorkspaceHierarchy(workspaceName: string): any {
    return this.findInTree(this.assignmentsHierarchy, workspaceName);
  }

  getAssignmentHierarchy(workspaceName: string, assignmentName: string): any {
    if (isNil(workspaceName) || workspaceName === PdfmConstants.DEFAULT_WORKSPACE) {
      return this.findInTree(this.assignmentsHierarchy, assignmentName);
    } else {
      const workspace = this.findInTree(this.assignmentsHierarchy, workspaceName);
      return this.findInTree(workspace, assignmentName);
    }
  }

  getAssignments(): Observable<any> {
    return fromIpcResponse(this.assignmentApi.getAssignments());
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

  update(assignments: object[]) {
    const assignmentsHierarchy = [];
    assignments.forEach(folderOrFile => {
      const folderOrFileKeys = Object.keys(folderOrFile);
      if (folderOrFileKeys.length > 0) {
        const assignmentName: string = folderOrFileKeys[0];
        if (assignmentName) {
          if (this.zipService.isValidAssignmentObject(folderOrFile[assignmentName])) {
            assignmentsHierarchy.push(folderOrFile);
          } else {
            // workspace folder??
            assignmentsHierarchy.push(folderOrFile);

          }
        }
      }
    });
    this.assignmentListSource$.next(assignmentsHierarchy);
    this.assignmentsHierarchy = assignmentsHierarchy;
  }

  saveMarks(location: string, marks: MarkInfo[][]): Observable<any> {
    return fromIpcResponse(this.assignmentApi.saveMarks(location, marks));
  }

  saveRubricMarks(location: string, rubricName: string = '', marks: any[]): Observable<any> {
    return fromIpcResponse(this.assignmentApi.saveRubricMarks(location, rubricName, marks));
  }

  getSavedMarks(location: string): Observable<any> {
    return fromIpcResponse(this.assignmentApi.getMarks(location));
  }

  shareExport(shareRequest: ShareAssignments): Observable<Uint8Array> {
    return fromIpcResponse(this.assignmentApi.shareExport(shareRequest));
  }

  finalizeAndExport(workspaceName: string = null, assignmentName: string): Observable<Uint8Array> {
    return fromIpcResponse(this.assignmentApi.finalizeAssignment(workspaceName, assignmentName));
  }

  finalizeAndExportRubric(workspaceName: string = null, assignmentName: string, assignmentRubric: IRubric): Observable<Uint8Array> {
    return fromIpcResponse(this.assignmentApi.finalizeAssignmentRubric(workspaceName, assignmentName, assignmentRubric.name));
  }

  createAssignment(createAssignmentInfo: CreateAssignmentInfo): Observable<any> {
    return fromIpcResponse(this.assignmentApi.createAssignment(createAssignmentInfo));
  }

  updateAssignment(updateAssignmentInfo: UpdateAssignment): Observable<any> {
    return fromIpcResponse(this.assignmentApi.updateAssignment(updateAssignmentInfo));
  }

  updateAssignmentRubric(rubric: string, assignmentName: string): Observable<IRubric> {
    return fromIpcResponse(this.assignmentApi.rubricUpdate(rubric, assignmentName));
  }

  getMarkedAssignmentsCount(workspaceName: string, assignmentName): Observable<number> {
    return fromIpcResponse(this.assignmentApi.getMarkedAssignmentsCount(workspaceName, assignmentName));
  }
}
