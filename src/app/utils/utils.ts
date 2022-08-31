import {
  AssignmentSettingsInfo,
  AssignmentState,
  DistributionFormat,
  SourceFormat,
  Submission,
  SubmissionState
} from '@shared/info-objects/assignment-settings.info';
import {Marker} from '@shared/info-objects/setting.info';
import {every, find, isNil, property, some} from 'lodash';

export interface Permissions {
  /**
   * Can submissions be allocated
   */
  canAllocate: boolean;

  /**
   * Can submission be re-allocated
   */
  canReAllocate: boolean;

  /**
   * Flag if the user can import assignments exported by markers
   */
  canImport: boolean;

  /**
   * Can submissions be modified
   */
  canManageSubmissions: boolean;

  /**
   * Can the rubric be modified
   */
  canManageRubric: boolean;

  /**
   * Can the assignment be finalized
   */
  canFinalize: boolean;

  /**
   * Can the assignment be exported for review
   */
  canExportReview: boolean;

  /**
   * Can the assignment export for review
   */
  canSendForModeration: boolean;

}

const ASSIGNMENT_OWNER_ID = property('owner.id');
const USER_ID = property('user.id');

function calculateCanAllocate(assignmentSettings: AssignmentSettingsInfo): boolean {
  if (assignmentSettings.distributionFormat !== DistributionFormat.STANDALONE) {
    // If the assignment is not in standalone format, it cannot be converted to DISTRIBUTED
    return false;
  }

  if (assignmentSettings.state === AssignmentState.FINALIZED) {
    // Cannot allocate after assignment has been finalized
    return false;
  }

  // Nothing else prevents allocating
  return true;
}

export function calculateCanReAllocateSubmission(submission: Submission): boolean {
  // Check for assignments that has not been marked
  return submission.state === SubmissionState.ASSIGNED_TO_MARKER || submission.state === SubmissionState.NOT_MARKED;
}

function calculateCanReAllocate(assignmentSettings: AssignmentSettingsInfo, user: Marker): boolean {
  if (assignmentSettings.distributionFormat !== DistributionFormat.DISTRIBUTED) {
    // Assignment must already be in a DISTRIBUTED form to be re-allocate
    return false;
  }

  if (assignmentSettings.state === AssignmentState.FINALIZED) {
    // Cannot re-allocate after assignment has been finalized
    return false;
  }


  if (isNil(user) || assignmentSettings.owner.id !== user.id) {
    // User is not the owner of the assignment
    return false;
  }

  return some(assignmentSettings.submissions, calculateCanReAllocateSubmission);
}

function calculateCanImport(assignmentSettings: AssignmentSettingsInfo, user: Marker): boolean {
  if (assignmentSettings.distributionFormat !== DistributionFormat.DISTRIBUTED) {
    // Only DISTRIBUTED assignment can import from marker
    return false;
  }
  if (assignmentSettings.state === AssignmentState.FINALIZED) {
    // Already finalized assignments can't accept imports
    return false;
  }
  if (isNil(user) || assignmentSettings.owner.id !== user.id) {
    // User must be the owner of the assignment to import
    return false;
  }

  // Check that there is at least one more submission not allocated to me, and in an assigned state
  const pendingSubmission = find(assignmentSettings.submissions, (submission) => {
    return submission.state === SubmissionState.ASSIGNED_TO_MARKER && submission.allocation.id !== user.id;
  });

  // Are we still waiting for imports from markers
  return !isNil(pendingSubmission);
}

function calculateCanManageSubmissions(assignmentSettings: AssignmentSettingsInfo): boolean {
  if (assignmentSettings.sourceFormat !== SourceFormat.MANUAL) {
    // Only manually created assignments can manage submissions
    return false;
  }

  if (assignmentSettings.state === AssignmentState.FINALIZED) {
    return false;
  }

  return assignmentSettings.distributionFormat === DistributionFormat.STANDALONE;
}

export function calculateCanManageRubric(assignmentSettings: AssignmentSettingsInfo): boolean {
  if (assignmentSettings.distributionFormat === DistributionFormat.DISTRIBUTED) {
    // Once distribution format changes to DISTRIBUTED, the rubric cannot be changed anymore
    return false;
  }
  if (assignmentSettings.state === AssignmentState.FINALIZED) {
    // Already finalized assignments can't change rubric
    return false;
  }

  // Nothing else prevents changing the rubric
  return true;
}

function calculateCanFinalize(assignmentSettings: AssignmentSettingsInfo, user: Marker): boolean {

  if (assignmentSettings.distributionFormat === DistributionFormat.DISTRIBUTED) {
    if (isNil(user) || assignmentSettings.owner.id !== user.id) {
      // User must be the owner of a DISTRIBUTED assignment to finalize
      return false;
    }
  }

  const allMatch = every(assignmentSettings.submissions, (submission) => {
    return submission.state === SubmissionState.MARKED ||
      submission.state === SubmissionState.MODERATED ||
      submission.state === SubmissionState.SENT_FOR_MODERATION;
  });


  return allMatch;
}
function calculateCanExportReview(assignmentSettings: AssignmentSettingsInfo, user: Marker): boolean {

  if (assignmentSettings.distributionFormat !== DistributionFormat.DISTRIBUTED) {
    // Only DISTRIBUTED assignments can be exported for review
    return false;
  }

  if (isNil(user) || ASSIGNMENT_OWNER_ID(assignmentSettings) === user.id) {
    // If the user is the owner it can't export for review
    return false;
  }

  return true;
}

export function calculateOpenInMarking(assignmentSettings: AssignmentSettingsInfo): boolean {
  return assignmentSettings.state !== AssignmentState.FINALIZED;
}

export function calculateCanEditMarking(assignmentSettings: AssignmentSettingsInfo, user: Marker, submission: Submission): boolean {

  if (assignmentSettings.distributionFormat === DistributionFormat.DISTRIBUTED) {

    if (assignmentSettings.state === AssignmentState.SENT_FOR_REVIEW) {
      return false;
    }

    if (!isNil(user) && assignmentSettings.owner.id === user.id) {
      // User is the owner of the assignment
      if (submission.state === SubmissionState.NOT_MARKED
        || submission.state === SubmissionState.MARKED
        || submission.state === SubmissionState.SENT_FOR_MODERATION) {
        // Submission state indicate that it has been returned from the marker
        return true;
      }
    }

    if (isNil(user) || submission.allocation.email !== user.email) {
      // If you are not allocated user for the assignment
      return false;
    }
  }


  return true;
}

export function calculateCanModerateSubmission(submission: Submission): boolean {
  return submission.state === SubmissionState.MARKED ||
    submission.state === SubmissionState.SENT_FOR_MODERATION;
}

function calculateCanSendForReview(assignmentSettings: AssignmentSettingsInfo, user: Marker): boolean {

  if (assignmentSettings.distributionFormat === DistributionFormat.DISTRIBUTED) {
    if (isNil(user) || user.id !== assignmentSettings.owner.id) {
      return false;
    }
  }

  if (assignmentSettings.state === AssignmentState.FINALIZED) {
    return false;
  }

  const allMatch = every(assignmentSettings.submissions, (submission) => {
    // Not marked state checked here separately because the function should be enabled as a whole
    return calculateCanModerateSubmission(submission) || submission.state === SubmissionState.NOT_MARKED ;
  });

  return allMatch;
}

export function checkPermissions(assignmentSettings: AssignmentSettingsInfo, user: Marker): Permissions {
  return {
    canAllocate: calculateCanAllocate(assignmentSettings),
    canReAllocate: calculateCanReAllocate(assignmentSettings, user),
    canImport: calculateCanImport(assignmentSettings, user),
    canManageSubmissions: calculateCanManageSubmissions(assignmentSettings),
    canManageRubric: calculateCanManageRubric(assignmentSettings),
    canFinalize: calculateCanFinalize(assignmentSettings, user),
    canExportReview: calculateCanExportReview(assignmentSettings, user),
    canSendForModeration: calculateCanSendForReview(assignmentSettings, user),
  };
}
