import {TreeNode, TreeNodeType} from '@shared/info-objects/workspace';

export const DEFAULT_COLOR = '#6f327a';
export const DEFAULT_WORKSPACE = 'Default Workspace';
export const SUBMISSION_FOLDER = 'Submission attachment(s)';
export const FEEDBACK_FOLDER = 'Feedback Attachment(s)';
export const SETTING_FILE = '.settings.json';
export const MARK_FILE = '.marks.json';
export const GRADES_FILE = 'grades.csv';

export const ASSIGNMENT_ROOT_FILES = [GRADES_FILE, 'grades.xls', 'grades.xlsx'];

export const ASSIGNMENT_BACKUP_DIR = '.backup';
export const FEEDBACK_ZIP_ENTRY_REGEX = /\/(.*)\/Feedback Attachment\(s\)\/(.*)\.pdf/;
export const SUBMISSION_ZIP_ENTRY_REGEX = /\/(.*)\/Submission attachment\(s\)\/(.*)\.pdf/;
export const FEEDBACK_REL_PATH_REGEX = /Feedback Attachment\(s\)\/(.*)\.pdf/;
export const SUBMISSION_REL_PATH_REGEX = /Submission attachment\(s\)\/(.*)\.pdf/;

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
