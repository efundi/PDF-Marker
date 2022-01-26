import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {SettingsService} from "@pdfMarkerModule/services/settings.service";
import {AppService} from "@coreModule/services/app.service";
import {AlertService} from "@coreModule/services/alert.service";
import {ElectronService} from "@coreModule/services/electron.service";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {YesAndNoConfirmationDialogComponent} from '@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {WorkspaceService} from '@sharedModule/services/workspace.service';

@Component({
  selector: 'pdf-marker-working-folder',
  templateUrl: './working-folder.component.html',
  styleUrls: ['./working-folder.component.scss']
})
export class WorkingFolderComponent implements OnInit {

  isLoading$ = this.appService.isLoading$;
  // settingsLMSSelected = "Sakai";
  // lmsChoices: string[] = ['Sakai'];
  createFolderForm: FormGroup;
  readonly displayedColumns: string[] = ['folder', 'actions'];
  folders: string[];
  private folderNameList: string[];
  dataSource: MatTableDataSource<string>;

  constructor(private fb: FormBuilder,
              private settingsService: SettingsService,
              private appService: AppService,
              private alertService: AlertService,
              private electronService: ElectronService,
              private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService) {
  }

  ngOnInit() {
    this.isLoading$.next(true);
    this.initForm();
    this.settingsService.getConfigurations().subscribe(configurations => {
      // this.createFolderForm.controls.defaultPath.setValue(configurations.defaultPath ? configurations.defaultPath : null);
      this.isLoading$.next(false);
    }, error => {
      this.isLoading$.next(false);
    });
    this.workspaceService.getWorkspaces().subscribe((workspaces: any[]) => {
      this.populateWorkspaces(workspaces);
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, 'Unable to retrieve rubrics');
      this.appService.isLoading$.next(false);
    });

  }

  private populateWorkspaces(folders: string[]) {
    let values: any[] = [];
    if (folders) {
      this.folders = folders;
      this.folderNameList = folders.map(item => {
        item = item.substr(item.lastIndexOf("\\") + 1, item.length);
        return item;
      });
      this.folderNameList.forEach(folder => {
        let value: any = {
          folder: ''
        };
        value.folder = folder;
        values.push(value);
      });
    }
    this.dataSource = new MatTableDataSource<string>(values);
  }

  private initForm() {
    this.createFolderForm = this.fb.group({
      workingFolders: [null, [Validators.required, Validators.pattern("^(\\w+\\.?\\_?\\-?\\s?\\d?)*\\w+$")]]
    });
  }

  onSubmitCreateFolder(event) {
    this.alertService.clear();
    if (this.createFolderForm.invalid) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }
    // Call Service to handle rest calls... also use interceptors
    this.isLoading$.next(true);
    this.workspaceService.createWorkingFolder(this.createFolderForm.value).subscribe((response) => {
      this.workspaceService.getWorkspaces().subscribe(data => {
        this.populateWorkspaces(data);
        this.appService.isLoading$.next(false);
        this.appService.openSnackBar(true, response.message);
        this.createFolderForm.reset();
        this.refreshSideBar();
      });
    }, error => {
      this.isLoading$.next(false);
    });
  }

  deleteFolder(item: string) {
    this.appService.isLoading$.next(true);
    this.workspaceService.deleteWorkspaceCheck(item).subscribe((hasWorkspaceAssignments: boolean) => {
      const config = new MatDialogConfig();
      config.width = '400px';
      config.maxWidth = '400px';
      config.data = {
        title: 'Confirmation',
        message: hasWorkspaceAssignments ? 'This workspace contains assignments, Are your sure you want to delete it?' :
          'Are you sure you want to delete this workspace?'
      };
      const shouldDeleteFn = (shouldDelete: boolean) => {
        if (shouldDelete) {
          this.deleteFolderImpl(item, shouldDelete);
        }
      };

      this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);

    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete workspace');
      this.appService.isLoading$.next(false);
    });
  }

  refreshSideBar() {
    this.appService.isLoading$.next(true);
    this.assignmentService.getAssignments().subscribe((assignments) => {
      this.assignmentService.update(assignments);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, "Refreshed list");
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Could not refresh list");
    });
  }

  private deleteFolderImpl(folder: string, confirmation: boolean) {
    // const newData = { folder, confirmation};
    this.workspaceService.deleteWorkspace(folder).subscribe((folders: any[]) => {
      this.populateWorkspaces(folders);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Workspace deleted');
      this.refreshSideBar();
    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete workspace');
      this.appService.isLoading$.next(false);
    });
  }
}
