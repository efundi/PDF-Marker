import {Injectable} from '@angular/core';
import {Observable, Subject} from "rxjs";
import {AppVersionInfo} from "@coreModule/info-objects/app-version.info";
import {IpcRenderer} from 'electron';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  private ipc: IpcRenderer;

  private appVersionSource$: Subject<AppVersionInfo> = new Subject<AppVersionInfo>();

  constructor() {
    if((<any>window).require) {
      this.ipc = (<any>window).require('electron').ipcRenderer;
      this.ipc.send('get_app_version');
      this.ipc.once('on_get_app_version', (event, appVersionInfo: AppVersionInfo) => {
        this.appVersionSource$.next(appVersionInfo);
      });
    } else {
      console.warn('Could not load electron ipc')
    }
  }

  getAppVersionObservable(): Observable<AppVersionInfo> {
    return this.appVersionSource$.asObservable();
  }
}
