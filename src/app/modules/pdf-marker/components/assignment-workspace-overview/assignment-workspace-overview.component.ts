import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {SakaiService} from "@coreModule/services/sakai.service";
import {Router} from "@angular/router";
import {AppService} from "@coreModule/services/app.service";
import {MatPaginator} from "@angular/material/paginator";
import {MatTableDataSource} from "@angular/material/table";
import {MatDialogConfig} from "@angular/material/dialog";
import {AlertService} from "@coreModule/services/alert.service";
import {FileSaverService} from "ngx-filesaver";
import {SettingsService} from "@pdfMarkerModule/services/settings.service";
import {SettingInfo} from "@pdfMarkerModule/info-objects/setting.info";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {FormBuilder} from "@angular/forms";
import * as fs from 'fs';
import * as path from 'path';
import {sep} from 'path';
import {AssignmentWorkspaceManageModalComponent} from '@pdfMarkerModule/components/assignment-workspace-manage-modal/assignment-workspace-manage-modal.component';
import {Subscription} from 'rxjs';

export interface WorkspaceDetails {
  assignmentTitle: string;

  submissionCount: number;

  marked?: number;

  notMarked?: number;

  type: string;

  currentWorkspace: string;

};

@Component({
  selector: 'pdf-marker-workspace-assignment-overview',
  templateUrl: './assignment-workspace-overview.component.html',
  styleUrls: ['./assignment-workspace-overview.component.scss']
})
export class AssignmentWorkspaceOverviewComponent implements OnInit, OnDestroy {
  private hierarchyModel;
  displayedColumns: string[] = ['assignmentTitle', 'submissionCount', 'progress', 'type'];
  dataSource: MatTableDataSource<WorkspaceDetails>;
  workspaceRows: WorkspaceDetails[] = [];
  workspaceName: string = 'Workspace Name';
  private assignmentGrades: any[] = [];
  assignmentsLength;
  assignmentPageSizeOptions: number[];
  readonly pageSize: number = 10;
  private assignmentsInFolder: any[] = [];
  private assignmentHeader: string;
  subscription: Subscription;

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  isSettings: boolean;
  isCreated: boolean;

  constructor(private assignmentService: AssignmentService,
              private sakaiService: SakaiService,
              private router: Router,
              private appService: AppService,
              private alertService: AlertService,
              private fileSaverService: FileSaverService,
              private settingsService: SettingsService,
              private fb: FormBuilder) {
  }

  ngOnInit() {
    this.initForm();
    this.subscription = this.assignmentService.onWorkspaceSourceChange.subscribe((selectedWorkspace) => {
      // let selectedWorkspace = this.assignmentService.selectedWorkspace;

      if (selectedWorkspace !== null) {
        // this.appService.isLoading$.next(true);
        this.hierarchyModel = selectedWorkspace;
        return this.generateDataFromModel();
        // this.appService.isLoading$.next(false);
      }
    }, error => {
      console.log(error);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, 'Unable to read selected workspace');
    });
    // this.appService.isLoading$.next(false);
  }

  private initForm() {
  }

  manageFolders(event) {
    const config = new MatDialogConfig();
    config.disableClose = true;
    config.width = "400px";
    config.height = "500px";
    config.data = {
      workspaceName: this.workspaceName,
      assignments: this.dataSource.data,
      hierarchyModel: this.hierarchyModel
    };


    const dialogRef = this.appService.createDialog(AssignmentWorkspaceManageModalComponent, config);

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);
      let edited = false;
      if (result && result.workspaceName && result.workspaceName !== this.workspaceName) {
        this.workspaceName = result.workspaceName;
        edited = true;
      }
      if (result && result.movedAssignments && result.movedAssignments.length > 0) {
        this.dataSource = new MatTableDataSource<WorkspaceDetails>(this.workspaceRows);
        edited = true;
      }
      if(edited){
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
    });
  }

  async getAssignmentSettings(assignmentName: string): Promise<AssignmentSettingsInfo> {
    this.appService.isLoading$.next(true);
    return await this.assignmentService.getAssignmentSettings(this.workspaceName, assignmentName).toPromise()
      .then((assignmentSettings) => {
        this.assignmentService.setSelectedAssignment(assignmentSettings);
        return assignmentSettings;
        this.appService.isLoading$.next(false);
      })
      .catch(() => {
        this.appService.isLoading$.next(false);
        return null;
      });
  }

  countFileFilter(startPath: any, filter: string): number {
    let count = 0;

    if (!fs.existsSync(startPath)) {
      return 0;
    }

    let files = fs.readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
      let filename = path.join(startPath, files[i]);
      let stat = fs.lstatSync(filename);
      if (stat.isDirectory()) {
        count = count + this.countFileFilter(filename, filter);
      } else if (filename.indexOf(filter) >= 0) {
        count = count + 1;
      }
    }
    return count;
  }

  private generateDataFromModel() {
    // let workspaceRows: WorkspaceDetails[] = [];
    this.workspaceRows = [];
    this.workspaceName = (Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0] : '';
    if (this.hierarchyModel[this.workspaceName]) {
      Object.keys(this.hierarchyModel[this.workspaceName]).forEach(key => {
        if (key) {
          let workspaceRow: WorkspaceDetails = {
            assignmentTitle: '',
            submissionCount: 0,
            marked: 0,
            notMarked: 0,
            type: '',
            currentWorkspace: ''
          };
          // Assignment Name
          workspaceRow.assignmentTitle = key;
          // Submissions Count
          const assignmentFiles = Object.keys(this.hierarchyModel[this.workspaceName][key]).
          filter(x => this.sakaiService.getAssignmentRootFiles().indexOf(x) === -1);
          workspaceRow.submissionCount = assignmentFiles.length;
          // Marked/Not Marked
          this.settingsService.getConfigurations().subscribe((configurations: SettingInfo) => {
            const count = this.countFileFilter(configurations.defaultPath + sep + this.workspaceName + sep + key, '.marks.json');
            workspaceRow.marked = count;
            workspaceRow.notMarked = workspaceRow.submissionCount - workspaceRow.marked;
          });
          // Type
          this.getAssignmentSettings(key).then((assignmentSettings) => {
            const assignmentSettingsInfo = assignmentSettings;
            workspaceRow.type = assignmentSettingsInfo.rubric ? 'Rubric' : 'Manual';

          });
          workspaceRow.currentWorkspace =  this.workspaceName;
          this.workspaceRows.push(workspaceRow);
        }
      });
      this.dataSource = new MatTableDataSource(this.workspaceRows);
      this.dataSource.paginator = this.paginator;
      this.assignmentsLength = this.workspaceRows.length;
      const range = [];
      let i = 0;
      while (i <= this.assignmentsLength) {
        i += this.pageSize;
        range.push(i);

        if (i > this.assignmentsLength)
          break;
      }
      this.assignmentPageSizeOptions = range;
      this.appService.isLoading$.next(false);
    }
  }

  private isNullOrUndefined = (object: any): boolean => {
    return (object === null || object === undefined);
  }

  private openYesNoConfirmationDialog(title: string = "Confirm", message: string) {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "400px";
    config.data = {
      title: title,
      message: message,
    };
  }

  ngOnDestroy(): void {
    this.assignmentService.setSelectedWorkspace(null);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
