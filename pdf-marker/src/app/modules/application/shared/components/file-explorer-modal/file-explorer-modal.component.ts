import {Component, Inject, OnInit} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

@Component({
  selector: 'pdf-marker-file-explorer-modal',
  templateUrl: './file-explorer-modal.component.html',
  styleUrls: ['./file-explorer-modal.component.scss']
})
export class FileExplorerModalComponent implements OnInit {

  filename: string;
  hierarchyModel;
  hierarchyModelKeys;

  constructor(private dialogRef: MatDialogRef<FileExplorerModalComponent>,
              @Inject(MAT_DIALOG_DATA) data) {
      this.hierarchyModel = data.hierarchyModel;
      this.hierarchyModelKeys = data.hierarchyModelKeys;
      this.filename = data.filename
  }

  ngOnInit() {
  }


  onClose() {
    this.dialogRef.close();
  }

}
