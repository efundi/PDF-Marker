import {Marker} from '@shared/info-objects/setting.info';
import {AssignmentState, Submission} from '@shared/info-objects/assignment-settings.info';
import {isNil} from 'lodash';

export function checkOpenInMarker(marker: Marker, submission: Submission, assignmentState: AssignmentState): boolean {
  const selfId = marker ? marker.id : null;
  const selfEmail = marker ? marker.email : null;
  const isNotFinalized = assignmentState !== AssignmentState.FINALIZED;
  const isSentForReview = assignmentState === AssignmentState.SENT_FOR_REVIEW;
  const allocatedToMe = isNil(submission.allocation) || submission.allocation.id === selfId || submission.allocation.email === selfEmail;
  return isNotFinalized && (isSentForReview || allocatedToMe);
}
