import {IRubric} from './rubric.class';
import {DEFAULT_COLOR} from '@shared/constants/constants';

export const AssignmentSettingsVersion = 1;

export enum SourceFormat {
  MANUAL = 'MANUAL',
  SAKAI = 'SAKAI',
  MOODLE = 'MOODLE',
  GENERIC = 'GENERIC',
}

/**
 * An enum defining the format in which an assignment is in.
 * Assignments can be imported, shared, and exported for marking.
 * This enum defines these formats as they are written to file.
 */
export enum DistributionFormat {

  /**
   * An assignment in the source format.
   */
  DISTRIBUTED = 'DISTRIBUTED',


  /**
   * An assignment that is only used by a single user.
   * This is also the default if nothing is set
   */
  STANDALONE = 'STANDALONE'

}

export enum AssignmentState {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  FINALIZED = 'FINALIZED',
  SENT_FOR_REVIEW = 'SENT_FOR_REVIEW',
}

/**
 * A reference to a marker if a submission is allocated
 */
export interface MakerReference {
  /**
   * Unique UUID of the maker as generated by the source assignment
   */
  id?: string;

  /**
   * Email address of the marker
   */
  email?: string;
}

/**
 * A interface defining a submission that has been allocated to a marker
 */
export interface SubmissionAllocation {
  /**
   *  Student ID of the submission to allocate
   */
  studentId: string;

  /**
   * Reference to the marker for the submission
   */
  marker: MakerReference;
}


export enum SubmissionState {
  /**
   * New untouched submission
   * text: "--"
   */
  NEW = 'NEW',

  /**
   * Allocated to a marker
   * text: "Assigned"
   */
  ASSIGNED_TO_MARKER = 'ASSIGNED_TO_MARKER',

  /**
   * A marked submission
   * text: "Marked"
   */
  MARKED = 'MARKED',

  /**
   * An assignment that has not been marked, but has been finalized or exported for review
   * text: 'Not Marked'
   */
  NOT_MARKED = 'NOT_MARKED',

  /**
   * An assignment with empty submissions, does not make sense to zip them for marking or allocate them. Also can’t mark them so the states will not update to 'Marked'.
   * text: 'No submission'
   */
  NO_SUBMISSION = 'NO_SUBMISSION',

  SENT_FOR_MODERATION = 'SENT_FOR_MODERATION',

  MODERATED = 'MODERATED'
}

export interface Submission {
  studentName: string;
  studentSurname: string;
  studentId: string;
  allocation: MakerReference;
  directoryName: string;
  mark: number | null;
  state: SubmissionState;
  /**
   * Status for this submission as received from the LMS (grades.csv)
   */
  lmsStatusText?: string;
}

export interface AssignmentSettingsInfo {
  /**
   * Unique identifier of this assignment from the source.
   * It can happen that markers have allocation imports that are
   * from the same source, but imported as different assignments.
   * This id should not be used to check for unique assignments in a workspace,
   * it should instead be used to match a marker's export with the original source assignment
   */
  sourceId: string;

  /**
   * Version of the settings assignment settings file
   */
  version?: number;

  /**
   * Name of the assignment
   */
  assignmentName: string;

  /**
   * Original owner of the assignment import.
   */
  owner?: MakerReference;

  /**
   * Format of the assignment directory
   */
  distributionFormat?: DistributionFormat;

  /**
   * Submissions part of this assignment.
   */
  submissions: Submission[];

  /**
   * Default color to use while marking
   */
  defaultColour?: string;

  /**
   * Copy of the actual rubric applied to this assignment
   */
  rubric?: IRubric;

  /**
   * Format of the source for this assignment
   */
  sourceFormat?: SourceFormat;

  /**
   * Current state of the assignment
   */
  state: AssignmentState;

  /**
   * Date when the assignment state changed
   */
  stateDate?: string;
}

export const DEFAULT_ASSIGNMENT_SETTINGS: AssignmentSettingsInfo = {
  assignmentName: null,
  sourceId: null,
  version: AssignmentSettingsVersion,
  distributionFormat: DistributionFormat.STANDALONE,
  owner: null,
  state: AssignmentState.NOT_STARTED,
  stateDate: null,
  defaultColour: DEFAULT_COLOR,
  rubric: null,
  sourceFormat: SourceFormat.MANUAL,
  submissions: []
};


