import {Injectable} from '@angular/core';
import {ImportInfo} from '@shared/info-objects/import.info';
import {fromIpcResponse} from './ipc.utils';
import {ImportIpcService} from '@shared/ipc/import.ipc-service';
import {Observable} from 'rxjs';
import {ZipInfo} from '@shared/info-objects/zip.info';

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  private importService: ImportIpcService;

  constructor() {
    this.importService = (window as any).importApi;
  }

  importAssignmentFile(data: ImportInfo) {
    return fromIpcResponse(this.importService.importZip(data));
  }

  isValidSakaiZip(filePath: string): Observable<boolean> {
    return fromIpcResponse(this.importService.isValidSakaiZip(filePath));
  }

  getZipEntries(filePath: string): Observable<ZipInfo[]> {
    return fromIpcResponse(this.importService.getZipEntries(filePath));
  }


}
