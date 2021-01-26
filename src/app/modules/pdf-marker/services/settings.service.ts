import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {SettingInfo} from "@pdfMarkerModule/info-objects/setting.info";

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor(private http: HttpClient) { }

  saveConfigurations(settings: SettingInfo):Observable<any> {
    return this.http.post('/api/settings', settings);
  }

  saveNewWorkingFolder(settings: SettingInfo):Observable<any> {
    return this.http.post('/api/settings/newFolder', settings);
  }

  getConfigurations(): Observable<any> {
    return this.http.get('/api/settings');
  }
}
