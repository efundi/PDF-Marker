import {Injectable} from '@angular/core';
import {ZipInfo} from '@shared/info-objects/zip.info';
import {SakaiService} from './sakai.service';

@Injectable({
  providedIn: 'root'
})
export class ZipService {

  constructor(private sakaiService: SakaiService) {
  }

  getZipModel(zipInfos: ZipInfo[]): any {
    return zipInfos.reduce((hier, zipInfo: ZipInfo) => {
      let pathObject: any = hier;
      zipInfo.name.split('/').forEach((item) => {
        if (!pathObject[item]) {
          pathObject[item] = {};
        }
        pathObject = pathObject[item];
      });

      pathObject.path = zipInfo.name;
      if (!zipInfo.dir) {
        pathObject.basename = zipInfo.name.split('/').pop();
      }

      return hier;
    }, {});
  }


  isValidAssignmentObject(assignmentHierarchy: object): boolean {
    const filePaths = Object.keys(assignmentHierarchy);
    const fileNames = this.sakaiService.getAssignmentRootFiles();
    for (const filePath of filePaths) {
      if (fileNames.indexOf(filePath) !== -1) {
        return true;
      }
    }

    return false;
  }
}
