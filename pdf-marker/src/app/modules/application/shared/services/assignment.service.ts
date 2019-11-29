import {Inject, Injectable, Optional, PLATFORM_ID} from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {EMPTY, Observable, ReplaySubject, Subject} from "rxjs";
import {makeStateKey, StateKey, TransferState} from "@angular/platform-browser";
import {isPlatformServer} from "@angular/common";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {catchError, retry, shareReplay} from "rxjs/operators";

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

  constructor(private http: HttpClient,
              @Optional() @Inject('ASSIGNMENT_LIST') private assignmentList: (callback) => void,
              @Inject(PLATFORM_ID) private platformId: any,
              private transferState: TransferState) {

    const transferKey: StateKey<string> = makeStateKey<string>('ListAssignments');
    if (isPlatformServer(this.platformId)) {
      this.assignmentList((err, assignmentList) => {
        if(err)
          console.log(err);
        this.assignments = assignmentList;
        this.transferState.set(transferKey, this.assignments);
      });
    } else {
      this.getAssignments().subscribe(assignments => {
        this.assignments = this.transferState.get<object[]>(transferKey, assignments);
        this.assignmentListSource$.next(this.assignments);
      }, error => {
        this.assignments = this.transferState.get<object[]>(transferKey, []);
      })
    }
    this.assignmentListSource$.next(this.assignments);
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

  getAssignmentSettings() {
    const body = {
      location: this.selectedPdfLocation
    };

    return this.http.post('/api/assignment/settings/fetch', body);
  }

  getAssignmentGrades() {
    const body = {
      location: Object.keys(this.selectedAssignment)[0]
    };

    return this.http.post('/api/assignment/grade', body);
  }

  getFile(pdfFileLocation: string) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const body = { location: pdfFileLocation };
    return this.http.post<Blob>("/api/pdf/file", body, {headers, responseType: 'blob' as 'json'});
  }

  update(assignments: object[]) {
    console.log("Update", assignments);
    this.assignments = assignments;
    this.assignmentListSource$.next(this.assignments);
  }

  setSelectedAssignment(selectedAssignment: object) {
    this.selectedAssignment = selectedAssignment;
    this.selectedAssignmentSource$.next(this.selectedAssignment);
  }

  getSelectedAssignment(): object {
    return this.selectedAssignment;
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

  getSelectedPdfURL(): string {
    return this.selectedPdfURL;
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

  getSavedMarks() {
    const body = {
      location: this.selectedPdfLocation
    };
    return this.http.post("/api/assignment/marks/fetch", body);
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
}
