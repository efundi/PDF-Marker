import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
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

  deleteRubric(data: any): Observable<IRubric[]> {
    return this.http.post<IRubric[]>('/api/rubric/delete', data);
  }
}
