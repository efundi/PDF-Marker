import {Injectable} from '@angular/core';
import {Observable, Subject} from "rxjs";
import {AppVersionInfo} from "@coreModule/info-objects/app-version.info";
import {ipcRenderer} from 'electron';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  private appVersionSource$: Subject<AppVersionInfo> = new Subject<AppVersionInfo>();

  constructor() {
    ipcRenderer.send('get_app_version');
    ipcRenderer.on('on_get_app_version', (event, appVersionInfo: AppVersionInfo) => {
      this.appVersionSource$.next(appVersionInfo);
    });
  }

  getAppVersionObservable(): Observable<AppVersionInfo> {
    return this.appVersionSource$.asObservable();
  }
}
