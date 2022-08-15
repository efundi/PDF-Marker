import {ZipFileType} from '@shared/info-objects/assignment-validate-result.info';

export interface ImportInfo {
  file: string;
  workspace: string;
  assignmentName: string;
  noRubric: boolean;
  rubricName: string;
  zipFileType: ZipFileType;
}
