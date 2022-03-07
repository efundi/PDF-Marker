import {find} from "lodash";

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
  children?: TreeNode[];
}

export interface Workspace extends TreeNode {
  type: TreeNodeType.WORKSPACE;
  children: WorkspaceAssignment[];
}

export interface WorkspaceAssignment extends TreeNode {
  type: TreeNodeType.ASSIGNMENT;
  children: (WorkspaceFile| StudentSubmission)[];
}

export interface WorkspaceFile extends TreeNode {
  type: TreeNodeType.FILE;
}

export interface SubmissionAttachments extends TreeNode {
  type: TreeNodeType.SUBMISSIONS_DIRECTORY;
  children: WorkspaceFile[];
}

export interface FeedbackAttachments extends TreeNode {
  type: TreeNodeType.FEEDBACK_DIRECTORY;
  children: WorkspaceFile[];
}

export interface StudentSubmission extends TreeNode {
  studentName: string;
  studentSurname: string;
  studentId: string;
  children: (WorkspaceFile|SubmissionAttachments|FeedbackAttachments)[];
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
