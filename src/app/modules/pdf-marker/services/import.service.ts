import { Injectable } from '@angular/core';
import {HttpClient, HttpEvent} from "@angular/common/http";
import {Observable} from "rxjs";
import {IRubric} from "@coreModule/utils/rubric.class";

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  constructor(private http: HttpClient) { }

  importAssignmentFile(data: any) {
    return this.http.post('/api/import', data, {
      reportProgress: true,
      observe: 'events'
    });
  }

  importRubricFile(data: FormData): Observable<IRubric[]> {
    return this.http.post<IRubric[]>('/api/rubric/import', data);
  }

  getRubrics(): Observable<IRubric[]> {
    return this.http.get<IRubric[]>('/api/rubric/import');
  }

  getRubricDetails(): Observable<IRubric[]> {
    return this.http.get<IRubric[]>('/api/rubric/details');
  }

  deleteRubric(data: any): Observable<IRubric[]> {
    return this.http.post<IRubric[]>('/api/rubric/delete', data);
  }

  getRubricContents(data: any): Observable<IRubric> {
    return this.http.post<IRubric>('/api/rubric/contents', data);
  }

  deleteRubricCheck(data: any): Observable<boolean> {
    return this.http.post<boolean>('/api/rubric/delete/check', data);
  }
}
