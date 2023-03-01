import {find} from 'lodash';

export enum TreeNodeType {
  WORKSPACE,
  ASSIGNMENT,
  SUBMISSION,
  FEEDBACK_DIRECTORY,
  SUBMISSIONS_DIRECTORY,
  FILE
}

export interface TreeNode {
  name: string;
  type: TreeNodeType;
  dateModified: Date;
  parent: TreeNode;
  children?: TreeNode[];
}

export interface WorkspaceTreeNode extends TreeNode {
  type: TreeNodeType.WORKSPACE;
  children: AssignmentTreeNode[];
  parent: null;
}

export interface AssignmentTreeNode extends TreeNode {
  type: TreeNodeType.ASSIGNMENT;
  children: (WorkspaceFileTreeNode| StudentSubmissionTreeNode)[];
  parent: WorkspaceTreeNode;
}

export interface WorkspaceFileTreeNode extends TreeNode {
  type: TreeNodeType.FILE;
}

export interface SubmissionAttachmentsTreeNode extends TreeNode {
  type: TreeNodeType.SUBMISSIONS_DIRECTORY;
  children: WorkspaceFileTreeNode[];
  parent: StudentSubmissionTreeNode;
}

export interface FeedbackAttachmentsTreeNode extends TreeNode {
  type: TreeNodeType.FEEDBACK_DIRECTORY;
  children: WorkspaceFileTreeNode[];
  parent: StudentSubmissionTreeNode;
}

export interface StudentSubmissionTreeNode extends TreeNode {
  studentName: string;
  studentSurname: string;
  studentId: string;
  children: (WorkspaceFileTreeNode|SubmissionAttachmentsTreeNode|FeedbackAttachmentsTreeNode)[];
  parent: AssignmentTreeNode;
}

export function findTreeNode(path: string, roots: TreeNode[]): TreeNode {
  const paths = path.split('/');
  let rootNode = find(roots, {name: paths[0]});
  paths.slice(1).forEach(pi => {
    rootNode = rootNode.children.find(tn => tn.name === pi);
  });
  return rootNode;
}

export function findTreeNodes(path: string, roots: TreeNode[]): TreeNode[] {
  const nodes: TreeNode[] = [];
  const paths = path.split('/');
  let rootNode = find(roots, {name: paths[0]});
  nodes.push(rootNode);
  paths.slice(1).forEach(pi => {
    rootNode = rootNode.children.find(tn => tn.name === pi);
    nodes.push(rootNode);
  });
  return nodes;
}
