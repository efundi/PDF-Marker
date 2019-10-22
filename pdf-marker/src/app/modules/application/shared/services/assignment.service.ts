import {Inject, Injectable, Optional, PLATFORM_ID} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable, ReplaySubject, Subject} from "rxjs";
import {makeStateKey, StateKey, TransferState} from "@angular/platform-browser";
import {isPlatformServer} from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {

  private assignmentListSource$: Subject<object[]> = new ReplaySubject<object[]>(1);
  private selectedAssignmentSource$: Subject<object> = new Subject<object>();
  private assignments: object[] = new Array<object>();
  private selectedAssignment: object;

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
      this.assignments = this.transferState.get<object[]>(transferKey, []);
    }
    this.assignmentListSource$.next(this.assignments);
  }

  getAssignments(): Observable<object[]> {
    return this.http.get<object[]>('/api/assignments');
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
}
