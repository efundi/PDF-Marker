import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {AssignmentSettingsInfo} from '../../../../shared/info-objects/assignment-settings.info';

@Injectable({
  providedIn: 'root'
})
export class AssignmentSettingsService {

  constructor(private http: HttpClient) { }

  saveConfigurations(settings: AssignmentSettingsInfo): Observable<any> {
    return this.http.post('/api/settings/assignment', settings);
  }

  getConfigurations(): Observable<any> {
    return this.http.get('/api/settings/assignment');
  }
}
