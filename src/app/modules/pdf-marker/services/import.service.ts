import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IRubric} from "../../../../shared/info-objects/rubric.class";

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


}
