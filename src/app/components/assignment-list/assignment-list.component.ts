import {Component, OnDestroy, OnInit, TrackByFunction} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {Subscription} from 'rxjs';
import {
  findTreeNodes,
  StudentSubmission,
  TreeNode,
  TreeNodeType,
  Workspace,
  WorkspaceAssignment,
  WorkspaceFile
} from '@shared/info-objects/workspace';
import {FlatTreeControl} from '@angular/cdk/tree';
import {isNil, map} from 'lodash';
import {RoutesEnum} from '../../utils/routes.enum';
import {Router} from '@angular/router';
import {MatTreeFlatDataSource, MatTreeFlattener} from '@angular/material/tree';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {GRADES_FILE, PDFM_FILES_FILTER} from '@shared/constants/constants';
import {SettingsService} from '../../services/settings.service';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {calculateOpenInMarking} from '../../utils/utils';
import {WorkspaceService} from '../../services/workspace.service';
import {SubmissionNavigationService} from '../../services/submission-navigation.service';

let treeId = 0;

/**
 * Tree node that has a reference to the parent
 */
export interface DisplayTreeNode extends TreeNode {
  id: number;
  parent: DisplayTreeNode;
  children: DisplayTreeNode[];
  icon: string;
  iconOpen?: string;
  level?: number;
}


function getIcon(treeNode: TreeNode): string {

  if (treeNode.type === TreeNodeType.FILE) {
    if (treeNode.name === GRADES_FILE) {
      return 'insert_chart';
    }
    return 'insert_drive_file';
  } else if (treeNode.type === TreeNodeType.WORKSPACE) {
    return 'folder';
  } else if (treeNode.type === TreeNodeType.ASSIGNMENT) {
    return 'description';
  } else {
    return 'chevron_right';
  }

}

function getIconOpen(treeNode: TreeNode): string {
  if (treeNode.type === TreeNodeType.FILE) {
    return null;
  } else if (treeNode.type === TreeNodeType.ASSIGNMENT) {
    return 'description';
  } else if (treeNode.type === TreeNodeType.WORKSPACE) {
    return 'folder';
  } else {
    return 'expand_more';
  }
}

function buildTreeNodes(workspaces: Workspace[]): DisplayTreeNode[] {
  const treeNodes: DisplayTreeNode[] = [];
  treeId = 0;
  workspaces.forEach(workspace => {
    // if (workspace.name === DEFAULT_WORKSPACE) {
    //   // Default workspace items are placed at the root
    //   treeNodes.push(...workspace.children.map(c => setParent(c, null)));
    // } else {
    treeNodes.push(setParent(workspace, null));
    // }
  });
  return treeNodes;
}

function setParent(treeNode: TreeNode, parentNode: DisplayTreeNode = null): DisplayTreeNode {
  const displayTreeNode: DisplayTreeNode = {
    ...treeNode,
    icon: getIcon(treeNode),
    iconOpen: getIconOpen(treeNode),
    id : treeId++,
    parent: parentNode,
    children: []
  };

  displayTreeNode.children = map(treeNode.children.filter(PDFM_FILES_FILTER), (child) => {
    return setParent(child, displayTreeNode);
  });
  return displayTreeNode;
}

@Component({
  selector: 'pdf-marker-assignment-list',
  templateUrl: './assignment-list.component.html',
  styleUrls: ['./assignment-list.component.scss']
})
export class AssignmentListComponent implements OnInit, OnDestroy {
  constructor(private settingsService: SettingsService,
              private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService,
              private router: Router,
              private submissionNavigationService: SubmissionNavigationService) { }


  workspaces: Workspace[] = [];
  treeControl = new FlatTreeControl<DisplayTreeNode>(node => node.level, node => node.children.length > 0);

  treeFlattener = new MatTreeFlattener(
    AssignmentListComponent.transformer,
    node => node.level,
    node => node.children.length > 0,
    node => node.children
  );


  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  treeNodes: DisplayTreeNode[] = [];
  activeNode: DisplayTreeNode;

  private settings: SettingInfo;
  private workspacesSubscription: Subscription;
  private selectedSubmissionSubscription: Subscription;
  private static transformer = (node: DisplayTreeNode, level: number) => {
    node.level = level;
    return node;
  }

  hasChild = (_: number, node: TreeNode) => (node.type !== TreeNodeType.FILE);
  trackBy: TrackByFunction<DisplayTreeNode> = (index: number, treeNode: DisplayTreeNode) => treeNode.id;

  ngOnInit() {
    this.settingsService.getConfigurations().subscribe((settings) => {
      this.settings = settings;
    });

    this.workspacesSubscription = this.workspaceService.workspaceList.subscribe(workspaces => {

      this.workspaces = workspaces;
      this.dataSource.data = [];
      const nodes = buildTreeNodes(workspaces);
      this.dataSource.data = nodes;
      this.treeNodes = nodes;
    });

    this.selectedSubmissionSubscription = this.assignmentService.selectedSubmissionChanged.subscribe((selectedSubmission) => {
      if (selectedSubmission) {
        const treePath = PdfmUtilsService.buildTreePath(selectedSubmission.pdfFile);
        const treeNodes: DisplayTreeNode[] = findTreeNodes(treePath, this.treeNodes) as DisplayTreeNode[];
        treeNodes.forEach((treeNode) => this.treeControl.expand(treeNode));
        this.activeNode = treeNodes[treeNodes.length - 1];
        setTimeout(() => {
          // Using a nasty timeout here to make sure the class is applied to the page
          const element = document.querySelector('.file-name-selected');
          element.scrollIntoView({ block: 'start', behavior: 'auto'});
        });
      }
    });
  }


  onNodeClicked(mouseEvent: MouseEvent, node: TreeNode) {

    if (node.type === TreeNodeType.ASSIGNMENT) {
      this.openAssignmentOverview(node);
    } else if (node.type === TreeNodeType.WORKSPACE) {
      this.openWorkspaceOverview(node);
    } else if (node.type === TreeNodeType.FILE && (node.parent.type === TreeNodeType.SUBMISSIONS_DIRECTORY || node.parent.type === TreeNodeType.FEEDBACK_DIRECTORY)) {
      this.openDocument(node as WorkspaceFile);
    }
  }

  private openAssignmentOverview(node: TreeNode): void {
    if (isNil(node.parent)) {
      this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, node.name]);
    } else {
      this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, node.name, node.parent.name]);
    }
  }

  private openWorkspaceOverview(node: TreeNode): void {
    this.router.navigate([RoutesEnum.ASSIGNMENT_WORKSPACE_OVERVIEW, node.name]);
  }

  private openDocument(node: WorkspaceFile): void {
    this.submissionNavigationService.openSubmission(node).subscribe();
  }


  ngOnDestroy() {
    this.workspacesSubscription.unsubscribe();
    this.selectedSubmissionSubscription.unsubscribe();
  }

  public collapseAll() {
    this.treeControl.collapseAll();
  }
}
