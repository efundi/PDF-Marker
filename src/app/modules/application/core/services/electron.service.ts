import {Injectable, NgZone} from '@angular/core';
import {Observable, Subject} from "rxjs";
import {AppVersionInfo} from "@coreModule/info-objects/app-version.info";
import {IpcRenderer} from 'electron';
import {AppSelectedPathInfo} from "@coreModule/info-objects/app-selected-path.info";
import {first} from "rxjs/operators";
import {FileFilterInfo} from "@coreModule/info-objects/file-filter.info";

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  private ipc: IpcRenderer;

  private appVersionSource$: Subject<AppVersionInfo> = new Subject<AppVersionInfo>();

  private fileSource$: Subject<any> = new Subject<any>();

  private folderSource$: Subject<AppSelectedPathInfo> = new Subject<AppSelectedPathInfo>();

  constructor(private zone: NgZone) {
    this.electronCommunication('get_app_version', 'on_get_app_version', this.appVersionSource$);
  }

  getAppVersionObservable(): Observable<AppVersionInfo> {
    return this.appVersionSource$.asObservable();
  }

  getFolder() {
    this.electronCommunication('get_folder', 'on_get_folder', this.folderSource$);
  }

  getFolderOb(): Observable<AppSelectedPathInfo> {
    return this.folderSource$.asObservable().pipe(first());
  }

  getFile(fileFilter: FileFilterInfo) {
    this.electronCommunication('get_file', 'on_get_file', this.fileSource$, fileFilter);
  }

  getFileOb(): Observable<any> {
    return this.fileSource$.asObservable().pipe(first());
  }

  private electronCommunication(sentMessage: string, receivedMessage: string, observableSource: Subject<any>, fileFilter: FileFilterInfo = null) {
    if((<any>window).require) {
      this.ipc = (<any>window).require('electron').ipcRenderer;
      if(fileFilter === null)
        this.ipc.send(sentMessage);
      else
        this.ipc.send(sentMessage, fileFilter);
      this.ipc.once(receivedMessage, (event, response: any) => {
        this.ipc.removeAllListeners(receivedMessage);
        this.zone.run(() => {
          observableSource.next(response);
        });
      });
    } else {
      console.warn('Could not load electron ipc')
    }
  }
}
