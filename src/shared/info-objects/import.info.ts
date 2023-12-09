import {DistributionFormat, SourceFormat} from "@shared/info-objects/assignment-settings.info";

export interface ImportInfo {
  file: string;
  workspace: string;
  assignmentName: string;
  rubricName: string;
  sourceFormat: SourceFormat;
  distributionFormat: DistributionFormat
}
