import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef} from '@angular/material/dialog';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {WorkspaceService} from '../../services/workspace.service';
import {AppService} from '../../services/app.service';
import {AssignmentService} from '../../services/assignment.service';
import {WorkspaceDetails} from '../assignment-workspace-overview/assignment-workspace-overview.component';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';
import {ConfirmationDialogComponent} from "../confirmation-dialog/confirmation-dialog.component";
import {some, map} from "lodash";

export interface WorkspaceDialogResult {
  prevWorkspaceName: string;

  workspaceName: string;

  assignmentsMoved: boolean;
}


@Component({
  selector: 'pdf-marker-assignment-workspace-manage-modal',
  templateUrl: './assignment-workspace-manage-modal.component.html',
  styleUrls: ['./assignment-workspace-manage-modal.component.scss']
})
export class AssignmentWorkspaceManageModalComponent implements OnInit {

  manageForm: FormGroup<{
    workspaceName: FormControl<string>,
    newWorkspaceFolder: FormControl<string>,
    selectedAssignments: FormControl<WorkspaceDetails[]>
  }>;

  /**
   * Flag if we can rename this folder
   * Default Workspace cannot be renamed
   */
  canRenameFolder = false;
  isEditing: boolean;

  workspaceName: string;
  prevWorkspaceName: string;
  assignments: WorkspaceDetails[] = [];
  assignmentsMoved = false;
  workspaceNameList: string[];

  constructor(private formBuilder: FormBuilder,
              public dialogRef: MatDialogRef<AssignmentWorkspaceManageModalComponent>,
              private appService: AppService,
              private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService,
              @Inject(MAT_DIALOG_DATA) public data: any) {

    this.initForm();
  }


  ngOnInit() {
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
      assignmentsMoved: this.assignmentsMoved
    };
    const workspace = this.manageForm.value.workspaceName;
    if (workspace !== this.prevWorkspaceName) {
      returnVar.workspaceName = workspace;
    }
    this.dialogRef.close(returnVar);
  }

  private initForm() {
    this.manageForm = this.formBuilder.group({
      workspaceName: [null as string, Validators.required],
      newWorkspaceFolder: [null as string],
      selectedAssignments: new FormControl([])
    });
  }

  saveWorkspaceName() {
    if (this.manageForm.valid) {
      const newName = this.manageForm.value.workspaceName;
      this.workspaceService.updateWorkspaceName(this.data.workspaceName, newName).subscribe({
        next: (workspaceName: string) => {
          this.appService.openSnackBar(true, 'Successfully updated workspace name');
          this.data.workspaceName = workspaceName;
          this.workspaceName = workspaceName;
        },
        error: (error) => {
          this.appService.openSnackBar(false, error);
        }
      });
    }
    this.isEditing = false;
  }


  onCancel() {
    this.manageForm.controls.workspaceName.setValue(this.data.workspaceName);
    this.isEditing = false;
  }

  onEdit() {
    this.isEditing = true;
  }

  onMove() {
    if (this.manageForm.valid) {
      const selectedAssignments = this.manageForm.value.selectedAssignments;
      const assignmentNames = map(selectedAssignments, 'assignmentTitle')
      const newFolder = this.manageForm.value.newWorkspaceFolder;
      let folder = this.data.workspaceName;
      if (this.manageForm.value.workspaceName) {
        folder = this.manageForm.value.workspaceName;
      }
      if (folder && newFolder && (selectedAssignments && selectedAssignments.length > 0)) {
        this.workspaceService.moveWorkspaceAssignments(folder, newFolder, assignmentNames).subscribe({
          next: () => {
            this.appService.openSnackBar(true, 'Successfully moved selected assignments');
            if (selectedAssignments && selectedAssignments.length > 0) {
              this.assignmentsMoved = true;
              selectedAssignments.forEach(assignment => {
                const foundIndex = this.assignments.findIndex(x => x.assignmentTitle === assignment.assignmentTitle);
                this.assignments.splice(foundIndex, 1);
                this.manageForm.get('selectedAssignments').patchValue([]);
              });
            }
          },
          error: (error) => {
            this.appService.openSnackBar(false, error);
          }
        });
      }
    }
  }

  deleteAssignments(){
    const selectedAssignments = this.manageForm.value.selectedAssignments;
    const assignmentNames = map(selectedAssignments, 'assignmentTitle')
    const hasMarked = some(selectedAssignments, a => a.marked > 0)

    let message = 'Are you sure you want to permanently delete all the selected assignment(s)?'
    if(hasMarked){
      message = 'Your selection contains marked assignment(s). ' + message;
    }

    const config = new MatDialogConfig();
    config.width = '600px';
    config.maxWidth = '600px';
    config.data = {
      title: 'Confirmation',
      message: message
    };
    let resolve;
    const promise = new Promise<boolean>((r) => resolve = r);

    this.appService.createDialog(ConfirmationDialogComponent, config, resolve);

    return promise.then((remove) => {
      if (!remove) {
        return Promise.reject();
      }
      this.workspaceService.deleteWorkspaceAssignments(this.workspaceName, assignmentNames)
        .subscribe({
          next: () => {
            this.assignmentsMoved = true;
            assignmentNames.forEach(assignmentName => {
              const foundIndex = this.assignments.findIndex(x => x.assignmentTitle === assignmentName);
              this.assignments.splice(foundIndex, 1);
              this.manageForm.get('selectedAssignments').patchValue([]);
            });

            this.appService.openSnackBar(true, 'Successfully deleted selected assignments');
          },
          error: (reason) => {
            this.appService.openSnackBar(false, 'Failed to delete assignments');
          }
        })

    });
  }
}
