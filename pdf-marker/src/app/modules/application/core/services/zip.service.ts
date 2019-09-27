import { Injectable } from '@angular/core';
import {Observable, Subject} from "rxjs";
import * as JSZip from 'jszip';
import {ZipInfo} from "@coreModule/info-objects/zip.info";

@Injectable({
  providedIn: 'root'
})
export class ZipService {

  private hierarchyModelSource$ = new Subject<any>();
  hierarchyModel$ = this.hierarchyModelSource$.asObservable();

  private jszip: JSZip;

  constructor() {
    this.jszip = new JSZip();
  }

  getEntries(file: File): Observable<ZipInfo[]> {

    this.jszip = new JSZip();

    return new Observable(subscriber => this.jszip.loadAsync(file)
      .then((zip) => {
        let zipEntries: ZipInfo[] = new Array();
        zip.forEach((relativePath, zipEntry) => {
          if(!zipEntry.dir)
            zipEntries.push({ ...zipEntry });
        });
        subscriber.next(zipEntries);
        subscriber.complete();
        zipEntries.sort((a, b) => (a.name > b.name) ? 1:-1);
        this.getZipModel(zipEntries);
      })
      .catch((e) => subscriber.error({e})));
  }

  setModel(hierarchyModel) {
    if(this.hierarchyModelSource$.observers.length > 1)
      this.hierarchyModelSource$.observers.pop();
    this.hierarchyModelSource$.next(hierarchyModel);
  }

  private getZipModel(zipInfos: ZipInfo[]) {
    let hierarchyModel = zipInfos.reduce((hier, zipInfo: ZipInfo) => {
      let pathObject: any = hier;
      zipInfo.name.split("/").forEach((item) => {
        if(!pathObject[item]) {
          pathObject[item] = {};
        }
        pathObject = pathObject[item];
      });

      pathObject.path = zipInfo.name;
      if(!zipInfo.dir) {
        pathObject.basename = zipInfo.name.split("/").pop();
      }

      return hier;
    }, {});

    this.setModel(hierarchyModel);
  }
}
