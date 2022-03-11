import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {SettingsService} from '../../services/settings.service';
import {AppService} from '../../services/app.service';
import {AlertService} from '../../services/alert.service';
import {AssignmentService} from '../../services/assignment.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {YesAndNoConfirmationDialogComponent} from '../yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {WorkspaceService} from '../../services/workspace.service';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {BusyService} from '../../services/busy.service';
import {DEFAULT_WORKSPACE} from "@shared/constants/constants";
import {filter} from "lodash";

@Component({
  selector: 'pdf-marker-working-folder',
  templateUrl: './working-folder.component.html',
  styleUrls: ['./working-folder.component.scss']
})
export class WorkingFolderComponent implements OnInit {

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
              private assignmentService: AssignmentService,
              private busyService: BusyService,
              private workspaceService: WorkspaceService) {

    this.initForm();
  }

  ngOnInit() {
    this.busyService.start();
    this.workspaceService.getWorkspaces().subscribe({
      next: (workspaces) => {
        this.populateWorkspaces(workspaces);
        this.busyService.stop();
      },
      error: (error) => {
        this.appService.openSnackBar(false, 'Unable to retrieve rubrics');
        this.busyService.stop();
      }
    });
  }



  private populateWorkspaces(folders: string[]) {
    const values: any[] = [];
    if (folders) {
      this.folders = filter(folders, (f) => f !== DEFAULT_WORKSPACE);
      this.folderNameList = this.folders.map(item => {
        return PdfmUtilsService.basename(item);
      });
      this.folderNameList.forEach(folder => {
        const value: any = {
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
      workspaceName: [null, [Validators.required, Validators.pattern('^(\\w+\\.?\\_?\\-?\\s?\\d?)*\\w+$')]]
    });
  }



  onSubmitCreateFolder(event) {
    this.alertService.clear();
    if (this.createFolderForm.invalid) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }
    // Call Service to handle rest calls... also use interceptors
    this.busyService.start();
    this.workspaceService.createWorkingFolder(this.createFolderForm.value.workspaceName).subscribe((response) => {
      this.workspaceService.getWorkspaces().subscribe(data => {
        this.populateWorkspaces(data);
        this.busyService.stop();
        this.appService.openSnackBar(true, 'Workspace created');
        this.createFolderForm.reset();
        this.refreshSideBar();
      });
    }, error => {
      this.appService.openSnackBar(false, error);
      this.busyService.stop();
    });
  }

  deleteFolder(item: string) {
    this.busyService.start();
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
        } else {
          this.busyService.stop();
        }
      };

      this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);

    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete workspace');
      this.busyService.stop();
    });
  }

  refreshSideBar() {
    this.busyService.start();
    this.assignmentService.refreshWorkspaces().subscribe((assignments) => {
      this.busyService.stop();
      this.appService.openSnackBar(true, 'Refreshed list');
    }, error => {
      this.busyService.stop();
    });
  }

  private deleteFolderImpl(folder: string, confirmation: boolean) {
    // const newData = { folder, confirmation};
    this.workspaceService.deleteWorkspace(folder).subscribe((folders: string[]) => {
      this.populateWorkspaces(folders);
      this.busyService.stop();
      this.appService.openSnackBar(true, 'Workspace deleted');
      this.refreshSideBar();
    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete workspace');
      this.busyService.stop();
    });
  }
}
