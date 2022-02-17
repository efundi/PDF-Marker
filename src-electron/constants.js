"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIGHTLIGHT_HEIGHT = exports.NOT_PROVIDED_COMMENT = exports.COULD_NOT_READ_WORKSPACE_LIST = exports.COULD_NOT_READ_COMMENT_LIST = exports.INVALID_STUDENT_FOLDER = exports.INVALID_PATH_PROVIDED = exports.NOT_PROVIDED_WORKSPACE_NAME = exports.NOT_PROVIDED_NEW_WORKSPACE_NAME = exports.NOT_PROVIDED_ASSIGNMENT_LOCATION = exports.EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC = exports.EXTRACTED_ZIP = exports.NOT_CONFIGURED_CONFIG_DIRECTORY = exports.COULD_NOT_CREATE_CONFIG_DIRECTORY = exports.FORBIDDEN_RESOURCE = exports.NOT_PROVIDED_RUBRIC = exports.COULD_NOT_READ_RUBRIC_LIST = exports.COULD_NOT_CREATE_RUBRIC_FILE = exports.INVALID_RUBRIC_JSON_FILE = exports.COMMENTS_FILE = exports.UPLOADS_DIR = exports.CONFIG_DIR = exports.APP_DATA_DIR = exports.FEEDBACK_FOLDER = exports.SUBMISSION_FOLDER = exports.RUBRICS_FILE = exports.GRADES_FILE = exports.MARK_FILE = exports.SETTING_FILE = exports.CONFIG_FILE = void 0;
const path_1 = require("path");
exports.CONFIG_FILE = 'config.json';
exports.SETTING_FILE = '.settings.json';
exports.MARK_FILE = '.marks.json';
exports.GRADES_FILE = 'grades.csv';
exports.RUBRICS_FILE = 'rubrics.json';
exports.SUBMISSION_FOLDER = 'Submission attachment(s)';
exports.FEEDBACK_FOLDER = 'Feedback Attachment(s)';
exports.APP_DATA_DIR = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME +
    '/Library/Preferences' : process.env.HOME + '/.local/share');
exports.CONFIG_DIR = exports.APP_DATA_DIR + path_1.sep + 'pdf-config' + path_1.sep;
exports.UPLOADS_DIR = '.' + path_1.sep + 'uploads';
exports.COMMENTS_FILE = 'comments.json';
/*COMMON MESSAGES*/
exports.INVALID_RUBRIC_JSON_FILE = 'Rubric file is not a valid JSON file!';
exports.COULD_NOT_CREATE_RUBRIC_FILE = 'Failed to read rubric file!';
exports.COULD_NOT_READ_RUBRIC_LIST = 'Could not read list of rubrics!';
exports.NOT_PROVIDED_RUBRIC = 'Rubric must be provided!';
exports.FORBIDDEN_RESOURCE = 'Forbidden access to resource!';
exports.COULD_NOT_CREATE_CONFIG_DIRECTORY = 'Failed to create configuration directory!';
exports.NOT_CONFIGURED_CONFIG_DIRECTORY = 'Configure default location to extract files to on the settings page!';
exports.EXTRACTED_ZIP = 'Successfully extracted assignment to selected workspace!';
exports.EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC = 'Successfully extracted assignment to selected workspace! ' +
    'But Failed to write to rubrics file!';
exports.NOT_PROVIDED_ASSIGNMENT_LOCATION = 'Assignment location not provided!';
exports.NOT_PROVIDED_NEW_WORKSPACE_NAME = 'New workspace name not provided!';
exports.NOT_PROVIDED_WORKSPACE_NAME = 'Current workspace name not provided!';
exports.INVALID_PATH_PROVIDED = 'Invalid path provided!';
exports.INVALID_STUDENT_FOLDER = 'Invalid student folder';
exports.COULD_NOT_READ_COMMENT_LIST = 'Could not read list of comments!';
exports.COULD_NOT_READ_WORKSPACE_LIST = 'Could not read list of working folders!';
exports.NOT_PROVIDED_COMMENT = 'Comment must be provided!';
exports.HIGHTLIGHT_HEIGHT = 20;
//# sourceMappingURL=constants.js.map