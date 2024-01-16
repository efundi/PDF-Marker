import {MarkInfo} from "@shared/info-objects/mark.info";


/**
 * Current version of the settings info
 */
export const SubmissionInfoVersion = 1;

export enum SubmissionMarkType {
 MARK = 'MARK',
 RUBRIC = 'RUBRIC'
}

export interface PageSettings {
  rotation: number;
}

export class SubmissionInfo {
  type: SubmissionMarkType;
  version = SubmissionInfoVersion;
  pageSettings: PageSettings[] = [];
  marks: number[] | MarkInfo[][] = [];

  constructor(version: number = SubmissionInfoVersion) {
    this.version = version;
  }
}

export class RubricSubmissionInfo extends SubmissionInfo {
  override type = SubmissionMarkType.RUBRIC;
  override marks: number[] = [];

  constructor(version: number = SubmissionInfoVersion) {
    super(version);
  }
}

export class MarkingSubmissionInfo extends SubmissionInfo {
  override type = SubmissionMarkType.MARK;
  override marks: MarkInfo[][] = [];

  constructor(version: number = SubmissionInfoVersion) {
    super(version);
  }
}
