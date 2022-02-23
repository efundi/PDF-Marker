import {IRubric} from './rubric.class';

export interface ImportInfo {
  file: string;
  workspace: string;
  assignmentName: string;
  noRubric: boolean;
  rubricName: string;
  assignmentType: string;
}
