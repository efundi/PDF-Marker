import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  constructor(private http: HttpClient) { }

  importFile(data: any) {
    return this.http.post('/api/import', data, {
      reportProgress: true,
      observe: 'events'
    });
  }
}
