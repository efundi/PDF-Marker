import {Component, Inject, OnInit} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {WorkspaceService} from '@sharedModule/services/workspace.service';
import {AppService} from '@coreModule/services/app.service';
import {AssignmentService} from '@sharedModule/services/assignment.service';
import {MatSelectionListChange} from '@angular/material';

@Component({
  selector: 'pdf-marker-assignment-workspace-manage-modal',
  templateUrl: './assignment-workspace-manage-modal.component.html',
  styleUrls: ['./assignment-workspace-manage-modal.component.scss']
})
export class AssignmentWorkspaceManageModalComponent implements OnInit {

  manageForm: FormGroup;

  isEditing: boolean;

  workspaceName: string;
  assignments: [];
  workspaceList: string[];
  workspaceNameList: string[];
  newWorkspaceName: string;

  selectedOptions: string[] = [];

  constructor(private formBuilder: FormBuilder,
              public dialogRef: MatDialogRef<AssignmentWorkspaceManageModalComponent>,
              private appService: AppService,
              private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService,
              @Inject(MAT_DIALOG_DATA) public data: any) {
  }


  ngOnInit() {
    this.isEditing = false;
    this.initForm();
    this.workspaceName = this.data.workspaceName;
    this.assignments = this.data.assignments;
    this.manageForm.controls.workspaceName.setValue(this.data.workspaceName);
    this.workspaceService.getWorkspaces().subscribe((workspaces: string[]) => {
      this.workspaceList = workspaces;
      this.workspaceNameList = workspaces.map(item => {
        item = item.substr(item.lastIndexOf("\\") + 1, item.length);
        return item;
      });
      const foundIndex = this.workspaceNameList.findIndex(x => x === this.data.workspaceName);
      delete this.workspaceNameList[foundIndex];
    });
  }

  onChange(change: MatSelectionListChange) {
    console.log(change.option.value, change.option.selected);
    console.log('on ng model change', change);
  }


  onClose() {
    this.dialogRef.close();
  }

  private initForm() {
    this.manageForm = this.formBuilder.group({
      workspaceName: [null],
      newWorkspaceFolder: [null],
      selectedAssignments: [null]
    });
  }

  onSave() {
    this.dialogRef.close();
  }

  saveWorkspaceName($event) {
    // this.dialogRef.close();
    this.workspaceService.updateWorkspaceName(this.data.workspaceName, this.manageForm.controls.workspaceName.value).subscribe((workspaceName: string) => {
      this.appService.openSnackBar(true, "Successfully updated workspaceName");
      this.data.workspaceName = workspaceName;
      this.workspaceName = workspaceName;
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.isLoading$.next(false);
      console.log(error);
      this.appService.openSnackBar(false, "Unable to update workspaceName");
    });
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
    console.log(this.manageForm.get('selectedAssignments').value);
    const assignments = this.manageForm.get('selectedAssignments').value;
    const newFolder = this.manageForm.get('newWorkspaceFolder').value;
    let folder = this.data.workspaceName;
    if (this.manageForm.get('workspaceName').value) {
      folder = this.manageForm.get('workspaceName').value;
    }
    if ( folder && newFolder && (this.assignments && this.assignments.length > 0)) {
      this.workspaceService.moveWorkspaceAssignments(folder, newFolder, assignments).subscribe((workspaceName: string) => {
        this.appService.openSnackBar(true, "Successfully moved selected assignments");
        this.appService.isLoading$.next(false);
      }, error => {
        this.appService.isLoading$.next(false);
        console.log(error);
        this.appService.openSnackBar(false, "Unable to move assignments");
      });
    }
  }
}
