import {sep} from 'path';

export const CONFIG_FILE = 'config.json';
export const SETTING_FILE = '.settings.json';
export const MARK_FILE = '.marks.json';
export const GRADES_FILE = 'grades.csv';
export const RUBRICS_FILE = 'rubrics.json';
export const SUBMISSION_FOLDER = 'Submission attachment(s)';
export const FEEDBACK_FOLDER = 'Feedback Attachment(s)';
export const APP_DATA_DIR = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME +
  '/Library/Preferences' : process.env.HOME + '/.local/share');
export const CONFIG_DIR = APP_DATA_DIR + sep + 'pdf-config' + sep;
export const UPLOADS_DIR = '.' + sep + 'uploads';
export const COMMENTS_FILE = 'comments.json';

/*COMMON MESSAGES*/
export const INVALID_RUBRIC_JSON_FILE = 'Rubric file is not a valid JSON file!';
export const COULD_NOT_CREATE_RUBRIC_FILE = 'Failed to read rubric file!';
export const COULD_NOT_READ_RUBRIC_LIST = 'Could not read list of rubrics!';
export const NOT_PROVIDED_RUBRIC = 'Rubric must be provided!';
export const FORBIDDEN_RESOURCE = 'Forbidden access to resource!';
export const COULD_NOT_CREATE_CONFIG_DIRECTORY = 'Failed to create configuration directory!';
export const NOT_CONFIGURED_CONFIG_DIRECTORY = 'Configure default location to extract files to on the settings page!';
export const EXTRACTED_ZIP = 'Successfully extracted assignment to selected workspace!';
export const EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC = 'Successfully extracted assignment to selected workspace! ' +
  'But Failed to write to rubrics file!';
export const NOT_PROVIDED_ASSIGNMENT_LOCATION = 'Assignment location not provided!';
export const NOT_PROVIDED_NEW_WORKSPACE_NAME = 'New workspace name not provided!';
export const NOT_PROVIDED_WORKSPACE_NAME = 'Current workspace name not provided!';
export const INVALID_PATH_PROVIDED = 'Invalid path provided!';
export const INVALID_STUDENT_FOLDER = 'Invalid student folder';

export const COULD_NOT_READ_COMMENT_LIST = 'Could not read list of comments!';
export const COULD_NOT_READ_WORKSPACE_LIST = 'Could not read list of working folders!';
export const NOT_PROVIDED_COMMENT = 'Comment must be provided!';

export const HIGHTLIGHT_HEIGHT = 20;
export const STUDENT_DIRECTORY_REGEX = /(.*)\((.+)\)/;
