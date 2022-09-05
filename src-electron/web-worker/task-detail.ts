import {AssignmentSettingsInfo} from '../../src/shared/info-objects/assignment-settings.info';
export interface TaskDetails {
  type: 'MarkerExport' | 'FinalizeSubmission' | 'AnnotateSubmission';
}

export interface MarkerExportTaskDetails extends TaskDetails {
  type: 'MarkerExport';
  studentIds: string[];
  assignmentName: string;
  workspaceFolder: string;
  exportPath: string;
  markerEmail: string;
}

export interface FinalizeSubmissionTaskDetails {
  type: 'FinalizeSubmission';
  assignmentName: string;
  workspaceFolder: string;
  assignmentSettings: AssignmentSettingsInfo;
  pdfPath: string;
}
export interface AnnotateSubmissionTaskDetails {
  type: 'AnnotateSubmission';
  sourcePath: string;
  outputPath: string;
  assignmentSettings: AssignmentSettingsInfo;
}
