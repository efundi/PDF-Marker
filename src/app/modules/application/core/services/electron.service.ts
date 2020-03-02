import {Injectable} from '@angular/core';
import {Observable, Subject} from "rxjs";
import {AppVersionInfo} from "@coreModule/info-objects/app-version.info";
import {IpcRenderer} from 'electron';
import {AppWorkingDirectoryInfo} from "@coreModule/info-objects/app-working-directory.info";
import {first} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  private ipc: IpcRenderer;

  private appVersionSource$: Subject<AppVersionInfo> = new Subject<AppVersionInfo>();

  private workingDirectorySource$: Subject<AppWorkingDirectoryInfo> = new Subject<AppWorkingDirectoryInfo>();

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

  getAppWorkingDirectory() {
    if((<any>window).require) {
      this.ipc = (<any>window).require('electron').ipcRenderer;
      this.ipc.send('get_working_directory');
      this.ipc.once('on_get_working_directory', (event, workingDirectory: any) => {
        this.ipc.removeAllListeners('on_get_working_directory');
        this.workingDirectorySource$.next(workingDirectory);
      });
    } else {
      console.warn('Could not load electron ipc')
    }
  }

  getAppWorkingDirectoryOb(): Observable<AppWorkingDirectoryInfo> {
    return this.workingDirectorySource$.asObservable().pipe(first());
  }
}
