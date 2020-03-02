import { Injectable } from '@angular/core';
import {Observable, Subject} from "rxjs";
import * as JSZip from 'jszip';
import {ZipInfo} from "@coreModule/info-objects/zip.info";
import {SakaiService} from "@coreModule/services/sakai.service";

@Injectable({
  providedIn: 'root'
})
export class ZipService {

  private hierarchyModelSource$ = new Subject<any>();
  hierarchyModel$ = this.hierarchyModelSource$.asObservable();

  private jszip: JSZip;

  constructor(private sakaiService: SakaiService) {
    this.jszip = new JSZip();
  }

  getEntries(file: File, loadModel: boolean = false): Observable<ZipInfo[]> {

    this.jszip = new JSZip();

    return new Observable(subscriber => this.jszip.loadAsync(file)
      .then((zip) => {
        let zipEntries: ZipInfo[] = [];
        zip.forEach((relativePath, zipEntry) => {
          if(!zipEntry.dir)
            zipEntries.push({ ...zipEntry });
        });

        zipEntries.sort((a, b) => (a.name > b.name) ? 1:-1);
        if(loadModel)
          this.getZipModel(zipEntries);
        subscriber.next(zipEntries);
        subscriber.complete();
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

  isValidZip(assignmentName: string, file: File): Observable<boolean> {
    let found = false;
    this.jszip = new JSZip();

    return new Observable(subscription => {
        this.jszip.loadAsync(file)
        .then((zip) => {
          const filePaths = Object.keys(zip.files);
          const fileNames = this.sakaiService.getAssignmentRootFiles();
          let count = 0;
          for(let filePath of filePaths) {
            let path = filePath.split("/");
            if(path[1] !== undefined && fileNames.indexOf(path[1]) !== -1) {
              found = true;
              break;
            }

            count++;
          }

          subscription.next(found);
          subscription.complete();
        })
        .catch(error => {
          subscription.error("Error trying to decipher zip file format validity!");
          subscription.complete();
        })
    });
  }

  isValidAssignmentObject(assignmentHierarchy: object): boolean {
    const filePaths = Object.keys(assignmentHierarchy);
    const fileNames = this.sakaiService.getAssignmentRootFiles();
    let found: boolean = false;
    for(let filePath of filePaths) {
      if(fileNames.indexOf(filePath) !== -1)
        return true;
    }

    return false;
  }
}
