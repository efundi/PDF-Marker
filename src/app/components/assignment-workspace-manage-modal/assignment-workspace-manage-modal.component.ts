import {Component, Inject, OnInit} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {WorkspaceService} from '../../services/workspace.service';
import {AppService} from '../../services/app.service';
import {AssignmentService} from '../../services/assignment.service';
import {WorkspaceDetails} from '../assignment-workspace-overview/assignment-workspace-overview.component';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {BusyService} from '../../services/busy.service';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';

export interface WorkspaceDialogResult {
  prevWorkspaceName: string;

  workspaceName: string;

  movedAssignments: any[];
}


@Component({
  selector: 'pdf-marker-assignment-workspace-manage-modal',
  templateUrl: './assignment-workspace-manage-modal.component.html',
  styleUrls: ['./assignment-workspace-manage-modal.component.scss']
})
export class AssignmentWorkspaceManageModalComponent implements OnInit {

  manageForm: FormGroup;

  /**
   * Flag if we can rename this folder
   * Default Workspace cannot be renamed
   */
  canRenameFolder = false;
  isEditing: boolean;

  workspaceName: string;
  prevWorkspaceName: string;
  assignments: WorkspaceDetails[] = [];
  returnSelectedAssignments: any[] = [];
  workspaceNameList: string[];

  selectedOptions: string[] = [];
  movedAssignments: string[] = [];

  constructor(private formBuilder: FormBuilder,
              public dialogRef: MatDialogRef<AssignmentWorkspaceManageModalComponent>,
              private appService: AppService,
              private assignmentService: AssignmentService,
              private busyService: BusyService,
              private workspaceService: WorkspaceService,
              @Inject(MAT_DIALOG_DATA) public data: any) {

    this.initForm();
  }


  ngOnInit() {
    // this.returnSelectedAssignments = [];
    this.isEditing = false;
    this.workspaceName = this.data.workspaceName;
    this.prevWorkspaceName = this.data.workspaceName;
    this.canRenameFolder = DEFAULT_WORKSPACE !== this.workspaceName;
    this.assignments = this.data.assignments;
    this.manageForm.controls.workspaceName.setValue(this.data.workspaceName);
    if (!this.canRenameFolder) {
      this.manageForm.controls.workspaceName.disable();
    }
    this.workspaceService.getWorkspaces().subscribe((workspaces: string[]) => {
      if (workspaces) {
        this.workspaceNameList = workspaces.map(item => {
          return PdfmUtilsService.basename(item);
        });
        const foundIndex = this.workspaceNameList.findIndex(x => x === this.data.workspaceName);
        if (foundIndex >= 0) {
          this.workspaceNameList.splice(foundIndex, 1);
        }
      }
    });
  }

  onClose() {
    const returnVar: WorkspaceDialogResult = {
      prevWorkspaceName: this.prevWorkspaceName,
      workspaceName: '',
      movedAssignments: []
    };
    const workspace = this.manageForm.controls.workspaceName.value;
    if (workspace !== this.prevWorkspaceName) {
      returnVar.workspaceName = workspace;
    }
    if (this.returnSelectedAssignments && this.returnSelectedAssignments.length > 0) {
      returnVar.movedAssignments = [...this.returnSelectedAssignments];
    }
    this.dialogRef.close(returnVar);
  }

  private initForm() {
    this.manageForm = this.formBuilder.group({
      workspaceName: [null, Validators.required],
      newWorkspaceFolder: [null],
      selectedAssignments: [null]
    });
  }

  saveWorkspaceName($event) {
    // this.dialogRef.close();
    if (this.manageForm.valid) {
      const newName = this.manageForm.controls.workspaceName.value;
      this.workspaceService.updateWorkspaceName(this.data.workspaceName, newName).subscribe((workspaceName: string) => {
        this.appService.openSnackBar(true, 'Successfully updated workspace name');
        this.data.workspaceName = workspaceName;
        this.workspaceName = workspaceName;
        this.busyService.stop();
      }, error => {
        this.busyService.stop();
        console.log(error);
        this.appService.openSnackBar(false, 'Unable to update workspace name');
      });
    }
    this.isEditing = false;
  }


  onCancel($event) {
    // this.dialogRef.close();
    this.manageForm.controls.workspaceName.setValue(this.data.workspaceName);
    this.isEditing = false;
  }

  onEdit($event) {
    this.isEditing = true;
  }

  onMove($event) {
    if (this.manageForm.valid) {
      const assignments = this.manageForm.get('selectedAssignments').value;
      const newFolder = this.manageForm.get('newWorkspaceFolder').value;
      let folder = this.data.workspaceName;
      if (this.manageForm.get('workspaceName').value) {
        folder = this.manageForm.get('workspaceName').value;
      }
      if (folder && newFolder && (assignments && assignments.length > 0)) {
        this.workspaceService.moveWorkspaceAssignments(folder, newFolder, assignments).subscribe((workspaceName: string) => {
          this.appService.openSnackBar(true, 'Successfully moved selected assignments');
          this.busyService.stop();
          if (assignments && assignments.length > 0) {

            assignments.forEach(assignment => {
              this.returnSelectedAssignments.push(assignment);
              const foundIndex = this.assignments.findIndex(x => x.assignmentTitle === assignment.assignmentTitle);
              this.assignments.splice(foundIndex, 1);
              this.manageForm.get('selectedAssignments').patchValue('');
            });
          }
        }, error => {
          this.busyService.stop();
          console.log(error);
          this.appService.openSnackBar(false, error);
        });
      }
    }
  }
}
