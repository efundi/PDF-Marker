import {Inject, Injectable, Optional, PLATFORM_ID} from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {Observable, ReplaySubject, Subject} from "rxjs";
import {makeStateKey, StateKey, TransferState} from "@angular/platform-browser";
import {isPlatformServer} from "@angular/common";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {MimeTypesEnum} from "@coreModule/utils/mime.types.enum";
import {RoutesEnum} from "@coreModule/utils/routes.enum";
import {Router} from "@angular/router";
import {AppService} from "@coreModule/services/app.service";
import {IRubric} from "@coreModule/utils/rubric.class";
import {ZipService} from "@coreModule/services/zip.service";

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {

  private assignmentListSource$: Subject<object[]> = new ReplaySubject<object[]>(1);
  private selectedAssignmentSource$: Subject<object> = new Subject<object>();
  private assignments: object[] = new Array<object>();
  private selectedAssignment: object;
  private selectedPdfLocation: string;
  private selectedPdfURL: string;
  private selectedPdfURLSource$: Subject<string> = new Subject<string>();
  private selectedPdfBlob: Blob;
  private assignmentSettingsInfo: AssignmentSettingsInfo;

  private selectedWorkspace: object;
  private selectedWorkspaceSource$: Subject<object> = new Subject<object>();

  constructor(private http: HttpClient,
              @Optional() @Inject('ASSIGNMENT_LIST') private assignmentList: (callback) => void,
              @Inject(PLATFORM_ID) private platformId: any,
              private transferState: TransferState,
              private router: Router,
              private appService: AppService,
              private zipService: ZipService) {

    const transferKey: StateKey<string> = makeStateKey<string>('ListAssignments');
    if (isPlatformServer(this.platformId)) {
      this.assignmentList((err, assignmentList) => {
        if (err) {
          console.log("Error ", err);
        } else {
          this.assignments = assignmentList;
          this.transferState.set(transferKey, this.assignments);
        }
      });
    } else {
      this.getAssignments().subscribe(assignments => {
        this.assignments = this.transferState.get<object[]>(transferKey, assignments);
        this.assignmentListSource$.next(this.assignments);
      }, error => {
        //this.assignments = this.transferState.get<object[]>(transferKey, []);
      })
    }
    //this.assignmentListSource$.next(this.assignments);
  }

  getAssignments(): Observable<object[]> {
    return this.http.get<object[]>('/api/assignments');
  }

  assignmentSettings(settings: AssignmentSettingsInfo) {
    const body = {
      settings: settings,
      location: this.selectedPdfLocation
    };

    return this.http.post('/api/assignment/settings', body);
  }

  getAssignmentSettings(assignmentName: string = null): Observable<AssignmentSettingsInfo> {
    if (!assignmentName)
        assignmentName = ((this.selectedPdfLocation && this.selectedPdfLocation.split("/").length > 0) ? this.selectedPdfLocation.split("/")[0] : "");

    const body = {
      location: assignmentName
    };
    console.log("getAssignmentSettings: " + assignmentName);
    return this.http.post<AssignmentSettingsInfo>('/api/assignment/settings/fetch', body);
  }

  getAssignmentGrades() {
    const body = {
      location: Object.keys(this.selectedAssignment)[0]
    };

    return this.http.post('/api/assignment/grade', body);
  }

  getFile(pdfFileLocation: string) {
    const headers = new HttpHeaders({
      'Content-Type': MimeTypesEnum.JSON,
      'Accept': MimeTypesEnum.JSON
    });
    const body = {location: pdfFileLocation};
    return this.http.post<Blob>("/api/pdf/file", body, {headers, responseType: 'blob' as 'json'});
  }

  configure(pdfLocation: string, blobData: Blob) {
    const blob = new Blob([blobData], {type: MimeTypesEnum.PDF});
    const fileUrl = URL.createObjectURL(blob);
    var assignmentName = "";
    var count = (pdfLocation.match(new RegExp("/", "g")) || []).length;
    if (count > 3) {
      var splitArray = pdfLocation.split("/");
      assignmentName = splitArray[0] + "/" + splitArray[1];
    }
    else
    assignmentName = ((pdfLocation && pdfLocation.split("/").length > 0) ? pdfLocation.split("/")[0] : "");
    this.getAssignmentSettings(assignmentName).subscribe((assignmentSettingsInfo: AssignmentSettingsInfo) => {
      this.setAssignmentSettings(assignmentSettingsInfo);
      this.setSelectedPdfURL(fileUrl, pdfLocation);
      this.setSelectedPdfBlob(blob);
      if (this.router.url !== RoutesEnum.ASSIGNMENT_MARKER && assignmentSettingsInfo.rubric === null)
        this.router.navigate([RoutesEnum.ASSIGNMENT_MARKER]);
      else if (this.router.url !== RoutesEnum.ASSIGNMENT_MARKER_RUBRIC && assignmentSettingsInfo.rubric !== null)
        this.router.navigate([RoutesEnum.ASSIGNMENT_MARKER_RUBRIC]);
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to read assignment settings");
    });
  }

  update(assignments: object[]) {
    const assignmentsHierarchy = [];
    const workspacesHierarchy = [];
    assignments.forEach(folderOrFile => {
      let folderOrFileKeys = Object.keys(folderOrFile);
      if (folderOrFileKeys.length > 0) {
        let assignmentName: string = folderOrFileKeys[0];
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
    this.assignments = assignmentsHierarchy;
    this.assignmentListSource$.next(this.assignments);
    // this.assignmentListSource$.next(this.assignments);
  }

  setSelectedAssignment(selectedAssignment: object) {
    this.selectedAssignment = selectedAssignment;
    this.selectedAssignmentSource$.next(this.selectedAssignment);
  }

  getSelectedAssignment(): object {
    return this.selectedAssignment;
  }

  setSelectedWorkspace(selectedWorkspace: object) {
    this.selectedWorkspace = selectedWorkspace;
    this.selectedWorkspaceSource$.next(this.selectedWorkspace);
  }

  getSelectedWorkspace(): object {
    return this.selectedWorkspace;
  }
  selectedWorkspaceChanged(): Observable<object> {
    return this.selectedWorkspaceSource$.asObservable();
  }

  dataChanged(): Observable<object[]> {
    return this.assignmentListSource$.asObservable();
  }

  selectedAssignmentChanged(): Observable<object> {
    return this.selectedAssignmentSource$.asObservable();
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

  saveMarks(marks: any[], totalMark: number = 0) {
    const body = {
      location: this.selectedPdfLocation,
      marks: marks,
      totalMark: totalMark
    };

    return this.http.post("/api/assignment/marks/save", body);
  }

  saveRubricMarks(rubricName: string = "", marks: any[], totalMark: number = 0) {
    const body = {
      location: this.selectedPdfLocation,
      marks: marks,
      totalMark: totalMark,
      rubricName: rubricName
    };

    return this.http.post("/api/assignment/rubric/marks/save", body);
  }

  getSavedMarks() {
    const body = {
      location: this.selectedPdfLocation
    };
    return this.http.post("/api/assignment/marks/fetch", body);
  }

  getAssingmentGlobalSettings() {
    const body = {
      location: this.selectedPdfLocation
    };
    return this.http.post("/api/assignment/globalSettings", body);
  }

  getSelectedPdfLocation(): string {
    return this.selectedPdfLocation;
  }

  saveStudentGrade(grade: number) {
    const body = {
      location: this.selectedPdfLocation,
      totalMark: grade
    };

    return this.http.post("/api/assignment/student/grade", body);
  }

  finalizeAndExport(assignmentName: string) {
    const body = {
      location: assignmentName,
    };
    const headers = new HttpHeaders({
      'Content-Type': MimeTypesEnum.JSON,
      'Accept': MimeTypesEnum.JSON
    });
    return this.http.post<Blob>("/api/assignment/finalize", body, {
      reportProgress: true,
      observe: 'events',
      headers,
      responseType: 'blob' as 'json',
    });
  }

  createAssignment(createAssignmentInfo: any): Observable<object> {
    return this.http.post("/api/assignment/create", createAssignmentInfo);
  }

  updateAssignment(updateAssignmentInfo: any): Observable<object> {
    return this.http.put<object>("/api/assignment/update", updateAssignmentInfo);
  }

  updateAssignmentRubric(rubric: string, assignmentName: string): Observable<IRubric> {
    const body = {
      rubricName: rubric,
      assignmentName: assignmentName
    };

    return this.http.post<IRubric>("/api/assignment/rubric/update", body);
  }

  finalizeAndExportRubric(assignmentName: string, assignmentRubric: IRubric) {
    const body = {
      location: assignmentName,
      rubricName: assignmentRubric.name
    };
    const headers = new HttpHeaders({
      'Content-Type': MimeTypesEnum.JSON,
      'Accept': MimeTypesEnum.JSON
    });
    return this.http.post<Blob>("/api/assignment/finalize/rubric", body, {
      reportProgress: true,
      observe: 'events',
      headers,
      responseType: 'blob' as 'json',
    });
  }

  getWorkspaces(): Observable<any> {
    const body = {
    };
    const headers = new HttpHeaders({
      'Content-Type': MimeTypesEnum.JSON,
      'Accept': MimeTypesEnum.JSON
    });
    return this.http.post<String[]>("/api/assignment/workspaces", body);
  }
}
