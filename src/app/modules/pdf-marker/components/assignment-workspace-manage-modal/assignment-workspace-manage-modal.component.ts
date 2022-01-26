import {Component, Inject, OnInit} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {WorkspaceService} from '@sharedModule/services/workspace.service';
import {AppService} from '@coreModule/services/app.service';
import {AssignmentService} from '@sharedModule/services/assignment.service';
import {WorkspaceDetails} from '@pdfMarkerModule/components/assignment-workspace-overview/assignment-workspace-overview.component';

export interface WorkspaceDialogResult {
  prevWorkspaceName: string;

  workspaceName: string;

  movedAssignments: any[];
};


@Component({
  selector: 'pdf-marker-assignment-workspace-manage-modal',
  templateUrl: './assignment-workspace-manage-modal.component.html',
  styleUrls: ['./assignment-workspace-manage-modal.component.scss']
})
export class AssignmentWorkspaceManageModalComponent implements OnInit {

  manageForm: FormGroup;

  isEditing: boolean;

  workspaceName: string;
  prevWorkspaceName: string;
  assignments: WorkspaceDetails[] = [];
  returnSelectedAssignments: any[] = [];
  workspaceList: string[];
  workspaceNameList: string[];
  newWorkspaceName: string;

  selectedOptions: string[] = [];
  movedAssignments: string[] = [];

  constructor(private formBuilder: FormBuilder,
              public dialogRef: MatDialogRef<AssignmentWorkspaceManageModalComponent>,
              private appService: AppService,
              private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService,
              @Inject(MAT_DIALOG_DATA) public data: any) {
  }


  ngOnInit() {
    // this.returnSelectedAssignments = [];
    this.isEditing = false;
    this.initForm();
    this.workspaceName = this.data.workspaceName;
    this.prevWorkspaceName = this.data.workspaceName;
    this.assignments = this.data.assignments;
    this.manageForm.controls.workspaceName.setValue(this.data.workspaceName);
    this.workspaceService.getWorkspaces().subscribe((workspaces: string[]) => {
      if (workspaces) {
        this.workspaceList = workspaces;
        this.workspaceNameList = workspaces.map(item => {
          item = item.substr(item.lastIndexOf("\\") + 1, item.length);
          return item;
        });
        const foundIndex = this.workspaceNameList.findIndex(x => x === this.data.workspaceName);
        this.workspaceList.splice(foundIndex, 1);
        this.workspaceNameList.splice(foundIndex, 1);
      }
      this.workspaceList.unshift('Default Workspace');
      this.workspaceNameList.unshift('Default Workspace');
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
    const assignments = this.manageForm.get('selectedAssignments').value;

    // if (assignments && assignments.length > 0) {
    if (this.returnSelectedAssignments && this.returnSelectedAssignments.length > 0) {
      returnVar.movedAssignments = [...this.returnSelectedAssignments];
    }
    this.workspaceService.announceWorkspaceChanges(returnVar);
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
        this.appService.openSnackBar(true, "Successfully updated workspace name");
        this.data.workspaceName = workspaceName;
        this.workspaceName = workspaceName;
        this.appService.isLoading$.next(false);
      }, error => {
        this.appService.isLoading$.next(false);
        console.log(error);
        this.appService.openSnackBar(false, "Unable to update workspace name");
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
      console.log(this.manageForm.get('selectedAssignments').value);
      const assignments = this.manageForm.get('selectedAssignments').value;
      const newFolder = this.manageForm.get('newWorkspaceFolder').value;
      let folder = this.data.workspaceName;
      if (this.manageForm.get('workspaceName').value) {
        folder = this.manageForm.get('workspaceName').value;
      }
      if (folder && newFolder && (assignments && assignments.length > 0)) {
        this.workspaceService.moveWorkspaceAssignments(folder, newFolder, assignments).subscribe((workspaceName: string) => {
          this.appService.openSnackBar(true, "Successfully moved selected assignments");
          this.appService.isLoading$.next(false);
          if (assignments && assignments.length > 0) {

            assignments.forEach(assignment => {
              this.returnSelectedAssignments.push(assignment);
              const foundIndex = this.assignments.findIndex(x => x.assignmentTitle === assignment.assignmentTitle);
              this.assignments.splice(foundIndex, 1);
              const newassignments = this.assignments.filter((_, i) => i !== foundIndex);

              this.manageForm.get('selectedAssignments').patchValue('');
            });
          }
        }, error => {
          this.appService.isLoading$.next(false);
          console.log(error);
          this.appService.openSnackBar(false, error);
        });
      }
    }
  }
}
