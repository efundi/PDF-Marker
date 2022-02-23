import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, ReplaySubject, Subject} from 'rxjs';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {MimeTypesEnum} from '../utils/mime.types.enum';
import {RoutesEnum} from '../utils/routes.enum';
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

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {

  private assignmentListSource$: Subject<object[]> = new ReplaySubject<object[]>(1);
  private selectedAssignmentSource: Subject<object> = new Subject<object>();
  onAssignmentSourceChange: Observable<object>;
  private selectedAssignment: object;
  private selectedPdfLocation: string;
  private selectedPdfURL: string;
  private selectedPdfURLSource$: Subject<string> = new Subject<string>();
  private selectedPdfBlob: Blob;
  private assignmentSettingsInfo: AssignmentSettingsInfo;

  private selectedWorkspace: object;
  // private selectedWorkspaceSource: Subject<object> = new Subject<object>();
  private workspaceSourceSubject: BehaviorSubject<object> = new BehaviorSubject<object>(null);
  // onWorkspaceSourceChange: Observable<object>;
  onWorkspaceSourceChange = this.workspaceSourceSubject.asObservable();
  // selectedWorkspaceSource$ = this.selectedWorkspaceSource.asObservable();

  private assignmentApi: AssignmentIpcService;

  constructor(private router: Router,
              private appService: AppService,
              private zipService: ZipService) {

    this.assignmentApi = (window as any).assignmentApi;

    this.getAssignments().subscribe(assignments => {
      this.assignmentListSource$.next(assignments);
    }, error => {
      // this.assignments = this.transferState.get<object[]>(transferKey, []);
    });

    this.onWorkspaceSourceChange = this.workspaceSourceSubject.asObservable();
    this.onAssignmentSourceChange = this.selectedAssignmentSource.asObservable();
  }

  getAssignments(): Observable<any> {
    return fromIpcResponse(this.assignmentApi.getAssignments());
  }

  assignmentSettings(updatedSettings: AssignmentSettingsInfo) {
    return fromIpcResponse(this.assignmentApi.updateAssignmentSettings(updatedSettings, this.selectedPdfLocation));
  }

  getAssignmentSettings(workspaceName: string = null, assignmentName: string = null): Observable<AssignmentSettingsInfo> {
    if (!assignmentName) {
      assignmentName = ((this.selectedPdfLocation && this.selectedPdfLocation.split('/').length > 0) ? this.selectedPdfLocation.split('/')[0] : '');
    }
    if (workspaceName && workspaceName !== PdfmConstants.DEFAULT_WORKSPACE) {
      assignmentName = workspaceName + '/' + assignmentName;
    }
    return fromIpcResponse(this.assignmentApi.getAssignmentSettings(assignmentName));
  }

  getAssignmentGrades(workspaceName: string = null, assignmentName: string = null): Observable<any> {
    if (workspaceName) {
      assignmentName = workspaceName + '/' + assignmentName;
    }
    return fromIpcResponse(this.assignmentApi.getGrades(assignmentName));
  }

  getFile(pdfFileLocation: string): Observable<Buffer> {
    return fromIpcResponse(this.assignmentApi.getPdfFile(pdfFileLocation));
  }

  configure(pdfLocation: string, blobData: Buffer) {
    const blob = new Blob([blobData], {type: MimeTypesEnum.PDF});
    const fileUrl = URL.createObjectURL(blob);
    let assignmentName = '';
    const count = (pdfLocation.match(new RegExp('/', 'g')) || []).length;
    if (count > 3) {
      const splitArray = pdfLocation.split('/');
      assignmentName = splitArray[0] + '/' + splitArray[1];
    } else {
      assignmentName = ((pdfLocation && pdfLocation.split('/').length > 0) ? pdfLocation.split('/')[0] : '');
    }
    this.getAssignmentSettings(null, assignmentName).subscribe({
      next: (assignmentSettingsInfo: AssignmentSettingsInfo) => {
        this.setAssignmentSettings(assignmentSettingsInfo);
        this.setSelectedPdfURL(fileUrl, pdfLocation);
        this.setSelectedPdfBlob(blob);
        if (this.router.url !== RoutesEnum.ASSIGNMENT_MARKER) {
          this.router.navigate([RoutesEnum.ASSIGNMENT_MARKER]);
        }
      },
      error: (error) => {
        this.appService.isLoading$.next(false);
        this.appService.openSnackBar(false, 'Unable to read assignment settings');
      }
    });
  }

  update(assignments: object[]) {
    const assignmentsHierarchy = [];
    const workspacesHierarchy = [];
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
    // this.assignmentListSource$.next(this.assignments);
  }

  setSelectedAssignment(selectedAssignment: object) {
    this.selectedAssignment = selectedAssignment;
    this.selectedAssignmentSource.next(selectedAssignment);
    // this.selectedAssignmentSource$.next(this.selectedAssignment);
  }

  getSelectedAssignment(): object {
    return this.selectedAssignment;
  }

  setSelectedWorkspace(selectedWorkspace: object) {
    this.selectedWorkspace = selectedWorkspace;
    this.workspaceSourceSubject.next(selectedWorkspace);
    // this.selectedWorkspaceSource.next(this.selectedWorkspace);
  }

  getSelectedWorkspace(): object {
    return this.selectedWorkspace;
  }

  selectedWorkspaceChanged(): Observable<object> {
    return this.workspaceSourceSubject.asObservable();
    // return this.selectedWorkspaceSource.asObservable();
  }

  dataChanged(): Observable<object[]> {
    return this.assignmentListSource$.asObservable();
  }

  selectedAssignmentChanged(): Observable<object> {
    return this.selectedAssignmentSource.asObservable();
  }

  setSelectedPdfURL(selectedPdfURL: string, selectedPdfLocation: string) {
    this.selectedPdfURL = selectedPdfURL;
    this.selectedPdfLocation = selectedPdfLocation;
    this.selectedPdfURLSource$.next(this.selectedPdfURL);
  }

  setAssignmentSettings(assignmentSettingsInfo: AssignmentSettingsInfo) {
    this.assignmentSettingsInfo = assignmentSettingsInfo;
  }

  getAssignmentSettingsInfo(): AssignmentSettingsInfo {
    return this.assignmentSettingsInfo;
  }

  getSelectedPdfURL(): string {
    return this.selectedPdfURL;
  }

  setSelectedPdfBlob(blob: Blob) {
    this.selectedPdfBlob = blob;
  }

  getSelectedPdfBlob() {
    return this.selectedPdfBlob;
  }

  selectedPdfURLChanged(): Observable<string> {
    return this.selectedPdfURLSource$.asObservable();
  }

  saveMarks(marks: MarkInfo[][], totalMark: number = 0): Observable<any> {
    return fromIpcResponse(this.assignmentApi.saveMarks(this.selectedPdfLocation, marks, totalMark));
  }

  saveRubricMarks(rubricName: string = '', marks: any[], totalMark: number = 0) {
    return fromIpcResponse(this.assignmentApi.saveRubricMarks(this.selectedPdfLocation, rubricName, marks ));
  }

  getSavedMarks(): Observable<any> {
    return fromIpcResponse(this.assignmentApi.getMarks(this.selectedPdfLocation));
  }

  getAssignmentGlobalSettings(): Observable<any> {
    return fromIpcResponse(this.assignmentApi.getAssignmentGlobalSettings(this.selectedPdfLocation));
  }

  getSelectedPdfLocation(): string {
    return this.selectedPdfLocation;
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

  getMarkedAssignmentsCount(workspaceName: string, assignmentName): Observable<number>{
    return fromIpcResponse(this.assignmentApi.getMarkedAssignmentsCount(workspaceName, assignmentName));
  }
}
