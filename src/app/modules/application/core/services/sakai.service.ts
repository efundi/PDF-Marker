import { Injectable } from '@angular/core';
import {ZipInfo} from '../../../../../shared/info-objects/zip.info';
import {SakaiConstants} from '../../../../../shared/constants/sakai.constants';

@Injectable({
  providedIn: 'root'
})
export class SakaiService {



  private readonly rulesMet = {
    assignmentRootFilesCount: 0,
    errors: false
  };

  private readonly studentDirectoryRules = {
    studentFolder: SakaiConstants.studentDetailsRegEx,
    directories: SakaiConstants.studentDirectories,
    files: SakaiConstants.studentFiles,
  };

  private readonly assignmentDirectoryRules = {
    files: SakaiConstants.assignmentRootFiles
  };

  constructor() { }

  private init() {
    this.rulesMet.assignmentRootFilesCount = 0;
    this.rulesMet.errors = false;
  }

  isValidSakaiFormatEntries(fileEntries: ZipInfo[])  {
    this.init();

    for (const fileEntry of fileEntries) {
      if (this.isNotValidatePath(fileEntry.name)) {
        if (this.rulesMet.assignmentRootFilesCount !== 1 || this.rulesMet.errors) {
          return false;
        }
      }
    }
    return true;
  }

  private isNotValidatePath(path: string) {
    const pathArray = path.split('/');

    let error = false;
    for (let i = 0; i < pathArray.length; i++) {
      const data = pathArray[i];
      if (pathArray.length === 4) {
        if (i === 0 || i === pathArray.length - 1) {
          continue;
        }
        if (!this.studentDirectoryRules.studentFolder.test(data) && i == 1) {
          console.log(data);
          error = true;
          break;
        } else if (this.doesNotExist(this.studentDirectoryRules.directories, data) && i == 2) {
          console.log(data);
          error = true;
          break;
        }
      } else if (pathArray.length === 3) {
        if (i === 0) {
          continue;
        }
        if (!this.studentDirectoryRules.studentFolder.test(data) && i === 1) {
          error = true;
          break;
        } else if (this.doesNotExist(this.studentDirectoryRules.files, data) && i === 2) {
          console.log(data);
          error = true;
          break;
        }
      } else if (pathArray.length === 2) {
        if (i === 0) {
          continue;
        }

        if (this.doesNotExist(this.assignmentDirectoryRules.files, data)) {
          console.log(data);
          error = true;
          break;
        } else {
          this.rulesMet.assignmentRootFilesCount++;
        }
      } else if (pathArray.length === 1) {
        console.log(data);
        error = true;
        break;
      }
    }

    if (error) {
      this.rulesMet.errors = false;
      return error;
    }
    return false;
  }

  private doesNotExist(pathList: string[], fileOrDir: string): boolean {
    return pathList.indexOf(fileOrDir) === -1;
  }

  getAssignmentRootFiles() {
    return SakaiConstants.assignmentRootFiles;
  }
}
