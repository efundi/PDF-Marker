import {TreeNode, TreeNodeType} from '@shared/info-objects/workspace';

export const DEFAULT_COLOR = '#6f327a';
export const DEFAULT_WORKSPACE = 'Default Workspace';
export const SUBMISSION_FOLDER = 'Submission attachment(s)';
export const FEEDBACK_FOLDER = 'Feedback Attachment(s)';
export const SETTING_FILE = '.settings.json';
export const MARK_FILE = '.marks.json';
export const GRADES_FILE = 'grades.csv';

export const ASSIGNMENT_ROOT_FILES = [GRADES_FILE, 'grades.xls', 'grades.xlsx'];

export const SUPPORTED_SUBMISSION_TYPES = [{
  name: 'Portable Document (pdf)',
  extensions: ['pdf']
}, {
  name: 'Powerpoint (ppt, pptx)',
  extensions: ['ppt', 'pptx']
}, {
  name: 'Word Document (doc, docx)',
  extensions: ['doc', 'docx']
}, {
  name: 'Spreadsheet (xls, xlsx)',
  extensions: ['xls', 'xlsx']
}, {
  name: 'Image (png, jpg, jpeg, tiff)',
  extensions: ['png', 'jpeg', 'tiff', 'jpg']
}];

export const ASSIGNMENT_BACKUP_DIR = '.backup';
export const FEEDBACK_ZIP_DIR_REGEX = /\/(.*)\/Feedback Attachment\(s\)\/$/;
export const SUBMISSION_ZIP_DIR_REGEX = /\/(.*)\/Submission attachment\(s\)\/$/;

export const FEEDBACK_ZIP_ENTRY_REGEX = /\/(.*)\/Feedback Attachment\(s\)\/(.*)\.pdf/;

const extensions = SUPPORTED_SUBMISSION_TYPES.flatMap(t => t.extensions).join('|');
export const SUBMISSION_ZIP_ENTRY_REGEX = new RegExp('(.*)\\/Submission attachment\\(s\\)\\/(.*)\\.(' + extensions + ')');

export const PDFM_FILES = [MARK_FILE, SETTING_FILE];


export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function PDFM_FILES_FILTER(treeNode: TreeNode): boolean {
  return !(treeNode.type === TreeNodeType.FILE && PDFM_FILES.indexOf(treeNode.name) >= 0);
}

/**
 * < 0, a should be before
 * = 0, same level
 * > 0, a should be after
 * @param a
 * @param b
 * @constructor
 */
export const PDFM_FILE_SORT = (a: TreeNode, b: TreeNode) => {
  let diff = a.type - b.type;
  if (diff === 0) {
    diff = a.name.localeCompare(b.name);
  }
  return diff;
};
