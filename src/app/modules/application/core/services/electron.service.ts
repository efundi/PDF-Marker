import {Injectable, NgZone} from '@angular/core';
import {from, Observable} from 'rxjs';
import {AppSelectedPathInfo} from '@coreModule/info-objects/app-selected-path.info';
import {FileFilterInfo} from '@coreModule/info-objects/file-filter.info';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  private electronApi;

  constructor(private zone: NgZone) {

    this.electronApi = (window as any).electronAPI;
  }

  getAppVersion(): Observable<any> {
    return from(this.electronApi.getAppVersion());
  }

  getFolder(): Observable<AppSelectedPathInfo> {
    return from(this.electronApi.getFolder()) as any;
  }


  getFile(fileFilter: FileFilterInfo): Observable<any> {
    return from(this.electronApi.getFile(fileFilter));
  }



  saveFile(fileFilter: FileFilterInfo): Observable<any> {
    if (!fileFilter.filename) {
      fileFilter.filename = 'download';
    }
    return from(this.electronApi.saveFile(fileFilter));
  }

  openExternalLink(externalResource: string): Observable<any> {
    return from(this.electronApi.openExternal({ resource: externalResource }));
  }
}
