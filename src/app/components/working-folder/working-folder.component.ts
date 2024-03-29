import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {SettingsService} from '../../services/settings.service';
import {AppService} from '../../services/app.service';
import {AlertService} from '../../services/alert.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {ConfirmationDialogComponent} from '../confirmation-dialog/confirmation-dialog.component';
import {WorkspaceService} from '../../services/workspace.service';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {BusyService} from '../../services/busy.service';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';
import {filter} from 'lodash';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';

@Component({
  selector: 'pdf-marker-working-folder',
  templateUrl: './working-folder.component.html',
  styleUrls: ['./working-folder.component.scss']
})
export class WorkingFolderComponent implements OnInit, AfterViewInit {

  createFolderForm: UntypedFormGroup;
  readonly displayedColumns: string[] = ['folder', 'actions'];
  folders: string[];
  private folderNameList: string[];
  dataSource = new MatTableDataSource<string>([]);

  @ViewChild(MatPaginator, {static: true})
  paginator: MatPaginator;

  @ViewChild(MatSort, {static: true})
  sort: MatSort;

  constructor(private fb: UntypedFormBuilder,
              private settingsService: SettingsService,
              private appService: AppService,
              private alertService: AlertService,
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
      error: () => {
        this.appService.openSnackBar(false, 'Unable to retrieve rubrics');
        this.busyService.stop();
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private populateWorkspaces(folders: string[]) {
    const values: any[] = [];
    if (folders) {
      this.folders = filter(folders, (f) => f !== DEFAULT_WORKSPACE);
      this.folderNameList = this.folders.map(item => {
        return PdfmUtilsService.basename(item);
      });
      this.folderNameList.forEach(folder => {
        values.push({
          folder
        });
      });
    }
    this.dataSource.data = values;
  }

  private initForm() {
    this.createFolderForm = this.fb.group({
      workspaceName: [null, Validators.compose([Validators.required, Validators.pattern('^(\\w+\\.?\\_?\\-?\\s?\\d?)*\\w+$')])]
    });
  }


  onSubmitCreateFolder() {
    this.alertService.clear();
    if (this.createFolderForm.invalid) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }
    // Call Service to handle rest calls... also use interceptors
    this.busyService.start();
    this.workspaceService.createWorkingFolder(this.createFolderForm.value.workspaceName).subscribe({
      next: () => {
        this.workspaceService.getWorkspaces().subscribe({
          next: (data) => {
          this.populateWorkspaces(data);
          this.busyService.stop();
          this.appService.openSnackBar(true, 'Workspace created');
          this.createFolderForm.reset();
          this.refreshSideBar();
        }});
      },
      error: (error) => {
        this.appService.openSnackBar(false, error);
        this.busyService.stop();
      }
    });
  }

  deleteFolder(item: string) {
    this.busyService.start();
    this.workspaceService.deleteWorkspaceCheck(item).subscribe({
      next: (hasWorkspaceAssignments: boolean) => {
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
            this.deleteFolderImpl(item);
          } else {
            this.busyService.stop();
          }
        };

        this.appService.createDialog(ConfirmationDialogComponent, config, shouldDeleteFn);

      },
      error: () => {
        this.appService.openSnackBar(false, 'Unable to delete workspace');
        this.busyService.stop();
      }
    });
  }

  refreshSideBar() {
    this.busyService.start();
    this.workspaceService.refreshWorkspaces().subscribe({
      next: () => {
        this.busyService.stop();
        this.appService.openSnackBar(true, 'Refreshed list');
      },
      error: () => {
        this.busyService.stop();
      }
    });
  }

  private deleteFolderImpl(folder: string) {
    this.workspaceService.deleteWorkspace(folder).subscribe({
      next: (folders: string[]) => {
        this.populateWorkspaces(folders);
        this.busyService.stop();
        this.appService.openSnackBar(true, 'Workspace deleted');
        this.refreshSideBar();
      },
      error: () => {
        this.appService.openSnackBar(false, 'Unable to delete workspace');
        this.busyService.stop();
      }
    });
  }
}
