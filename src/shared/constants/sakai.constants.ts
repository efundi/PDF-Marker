const SakaiConstantsObj: any = {
  studentDetailsRegEx: /^.*,.*\([0-9]+\)$/,
  feedbackDirectoryName:  'Feedback Attachment(s)',
  submissionDirectoryName: 'Submission attachment(s)',
  commentsFileName: 'comments.txt',
  timestampFileName: 'timestamp.txt',

  assignmentRootFiles: ['grades.csv', 'grades.xls', 'grades.xlsx'],
  formatErrorMessage : 'Invalid zip format. Please select a file exported from Sakai',
};


SakaiConstantsObj.studentFiles = [SakaiConstantsObj.commentsFileName, SakaiConstantsObj.timestampFileName];
SakaiConstantsObj.studentDirectories = [SakaiConstantsObj.feedbackDirectoryName, SakaiConstantsObj.submissionDirectoryName];

export const SakaiConstants = SakaiConstantsObj;
