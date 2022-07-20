import {TreeNode, TreeNodeType} from '@shared/info-objects/workspace';

export const DEFAULT_WORKSPACE = 'Default Workspace';
export const SUBMISSION_FOLDER = 'Submission attachment(s)';
export const FEEDBACK_FOLDER = 'Feedback Attachment(s)';
export const SETTING_FILE = '.settings.json';
export const MARK_FILE = '.marks.json';
export const GRADES_FILE = 'grades.csv';

export const PDFM_FILES = [MARK_FILE, SETTING_FILE];

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
