import {Injectable} from '@angular/core';
import {SakaiConstants} from '@shared/constants/sakai.constants';

@Injectable({
  providedIn: 'root'
})
export class ZipService {

  constructor() {
  }

  isValidAssignmentObject(assignmentHierarchy: object): boolean {
    const filePaths = Object.keys(assignmentHierarchy);
    const fileNames = SakaiConstants.assignmentRootFiles;
    for (const filePath of filePaths) {
      if (fileNames.indexOf(filePath) !== -1) {
        return true;
      }
    }

    return false;
  }
}
