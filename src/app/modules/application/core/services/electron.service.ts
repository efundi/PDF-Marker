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

  private observableSource$: Subject<any> = new Subject<any>();

  private appVersionSource$: Subject<AppVersionInfo> = new Subject<AppVersionInfo>();

  private fileSource$: Subject<AppSelectedPathInfo> = new Subject<AppSelectedPathInfo>();

  private folderSource$: Subject<AppSelectedPathInfo> = new Subject<AppSelectedPathInfo>();

  private saveSource$: Subject<AppSelectedPathInfo>  = new Subject<AppSelectedPathInfo>();

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

  getFileOb(): Observable<AppSelectedPathInfo> {
    return this.fileSource$.asObservable().pipe(first());
  }

  saveFile(fileFilter: FileFilterInfo) {
    if(!fileFilter.filename)
      fileFilter.filename = "download";
    this.electronCommunication('save_file', 'on_save_file', this.saveSource$, fileFilter);
  }

  saveFileOb(): Observable<AppSelectedPathInfo> {
    return this.saveSource$.asObservable().pipe(first());;
  }

  getObservable(): Observable<any> {
    return this.observableSource$.asObservable();
  }

  openExternalLink(externalResource: string) {
    this.electronCommunication('open_external_link', 'on_open_external_link', this.observableSource$, { resource: externalResource });
  }
  private electronCommunication(sentMessage: string, receivedMessage: string, observableSource: Subject<any>, args: any = null,) {
    if((<any>window).require) {
      this.ipc = (<any>window).require('electron').ipcRenderer;
      if(args === null)
        this.ipc.send(sentMessage);
      else
        this.ipc.send(sentMessage, args);
      this.ipc.once(receivedMessage, (event, response: any) => {
        this.ipc.removeAllListeners(receivedMessage);
        this.ipc.removeAllListeners('on_error');
        this.zone.run(() => {
          observableSource.next(response);
        });
      });

      this.ipc.once('on_error', (event, response: any) => {
        this.ipc.removeAllListeners('on_error');
        this.ipc.removeAllListeners(receivedMessage);
        this.zone.run(() => {
          observableSource.error(response);
        });
      });
    } else {
      console.warn('Could not load electron ipc')
    }
  }
}
