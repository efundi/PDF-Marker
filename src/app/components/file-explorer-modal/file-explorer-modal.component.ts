import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FlatTreeControl} from '@angular/cdk/tree';
import {MatTreeFlatDataSource, MatTreeFlattener} from '@angular/material/tree';
import {TreeNode} from '@shared/info-objects/workspaceTreeNode';
import {DisplayTreeNode} from '../assignment-list/assignment-list.component';
import {PDFM_FILE_SORT} from '@shared/constants/constants';

@Component({
  selector: 'pdf-marker-file-explorer-modal',
  templateUrl: './file-explorer-modal.component.html',
  styleUrls: ['./file-explorer-modal.component.scss']
})
export class FileExplorerModalComponent {

  filename: string;
  treeControl = new FlatTreeControl<DisplayTreeNode>(node => node.level, node => node.children.length > 0);

  treeFlattener = new MatTreeFlattener(
    FileExplorerModalComponent.transformer,
    node => node.level,
    node => node.children.length > 0,
    node => node.children
  );


  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  private static transformer = (node: DisplayTreeNode, level: number) => {
    node.level = level;
    node.children.sort(PDFM_FILE_SORT);
    return node;
  }
  constructor(private dialogRef: MatDialogRef<FileExplorerModalComponent>,
              @Inject(MAT_DIALOG_DATA) data) {
      this.filename = data.filename;
      this.dataSource.data = data.treeNodes;
  }

  hasChild = (_: number, node: TreeNode) => node.children.length > 0;

  onClose() {
    this.dialogRef.close();
  }

}
