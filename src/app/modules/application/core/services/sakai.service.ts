import { Injectable } from '@angular/core';
import {ZipInfo} from "@coreModule/info-objects/zip.info";

@Injectable({
  providedIn: 'root'
})
export class SakaiService {

  private readonly studentDetailsRegEx = /^.*,.*\([0-9]+\)$/;
  private readonly feedbackDirectoryName: string = "Feedback Attachment(s)";
  private readonly submissionDirectoryName: string = "Submission attachment(s)";
  private readonly commentsFileName: string = "comments.txt";
  private readonly timestampFileName: string = "timestamp.txt";

  private readonly studentFiles = [this.commentsFileName, this.timestampFileName];
  private readonly studentDirectories = [this.feedbackDirectoryName, this.submissionDirectoryName];
  private readonly assignmentRootFiles = ["grades.csv", "grades.xls", "grades.xlsx"];
  readonly formatErrorMessage = "Invalid zip format. Please select a file exported from Sakai";

  private readonly rulesMet = {
    assignmentRootFilesCount: 0,
    errors: false
  };

  private readonly studentDirectoryRules = {
    studentFolder: this.studentDetailsRegEx,
    directories: this.studentDirectories,
    files: this.studentFiles,
  };

  private readonly assignmentDirectoryRules = {
    files: this.assignmentRootFiles
  };

  constructor() { }

  private init() {
    this.rulesMet.assignmentRootFilesCount = 0;
    this.rulesMet.errors = false;
  }

  isValidSakaiFormatEntries(fileEntries: ZipInfo[])  {
    this.init();

    for(let fileEntry of fileEntries) {
      if(this.isNotValidatePath(fileEntry.name)) {
        if(this.rulesMet.assignmentRootFilesCount !== 1 || this.rulesMet.errors)
          return false;
      }
    }
    return true;
  }

  private isNotValidatePath(path: string) {
    const pathArray = path.split("/");

    let error = false;
    for(let i = 0; i < pathArray.length; i++) {
      let data = pathArray[i];
      if(pathArray.length == 4) {
        if(i == 0 || i == pathArray.length - 1)
          continue;
        if(!this.studentDirectoryRules.studentFolder.test(data) && i == 1) {
          console.log(data);
          error = true;
          break;
        } else if(this.doesNotExist(this.studentDirectoryRules.directories, data) && i == 2) {
          console.log(data);
          error = true;
          break;
        }
      } else if(pathArray.length == 3) {
        if(i == 0)
          continue;
        if(!this.studentDirectoryRules.studentFolder.test(data) && i == 1) {
          error = true;
          break;
        } else if(this.doesNotExist(this.studentDirectoryRules.files, data) && i == 2) {
          console.log(data);
          error = true;
          break;
        }
      } else if(pathArray.length == 2) {
        if(i == 0)
          continue;

        if(this.doesNotExist(this.assignmentDirectoryRules.files, data)) {
          console.log(data);
          error = true;
          break;
        } else
          this.rulesMet.assignmentRootFilesCount++;
      } else if(pathArray.length == 1) {
        console.log(data);
        error = true;
        break;
      }
    }

    if(error) {
      this.rulesMet.errors = false;
      return error;
    }
    return false;
  }

  private doesNotExist(pathList: string[], fileOrDir: string): boolean {
    return pathList.indexOf(fileOrDir) == -1;
  }

  getAssignmentRootFiles() {
    return this.assignmentRootFiles;
  }
}
