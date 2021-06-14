import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {SakaiService} from "@coreModule/services/sakai.service";
import {Router} from "@angular/router";
import {AppService} from "@coreModule/services/app.service";
import {MatPaginator} from "@angular/material/paginator";
import {MatTableDataSource} from "@angular/material/table";
import {MatDialogConfig} from "@angular/material/dialog";
import {YesAndNoConfirmationDialogComponent} from "@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component";
import {AlertService} from "@coreModule/services/alert.service";
import {HttpEventType} from "@angular/common/http";
import {FileSaverService} from "ngx-filesaver";
import {SettingsService} from "@pdfMarkerModule/services/settings.service";
import {SettingInfo} from "@pdfMarkerModule/info-objects/setting.info";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {ImportService} from "@pdfMarkerModule/services/import.service";
import {IRubric, IRubricName} from "@coreModule/utils/rubric.class";
import {FormBuilder, FormGroup} from "@angular/forms";
import {ElectronService} from "@coreModule/services/electron.service";
import * as fs from 'fs';
import * as path from 'path';
import {sep} from 'path';
import {RoutesEnum} from '@coreModule/utils/routes.enum';

export interface WorkspaceDetails {
  assignmentTitle: string;

  submissionCount: number;

  marked?: number;

  notMarked?: number;

  type: string;

  curWorkspace: string;

};

@Component({
  selector: 'pdf-marker-workspace-assignment-overview',
  templateUrl: './assignment-workspace-overview.component.html',
  styleUrls: ['./assignment-workspace-overview.component.scss']
})
export class AssignmentWorkspaceOverviewComponent implements OnInit, OnDestroy {
  private hierarchyModel;
  displayedColumns: string[] = ['assignmentTitle', 'submissionCount', 'progress', 'type', 'curWorkspace'];
  dataSource: MatTableDataSource<WorkspaceDetails>;
  workspaceName: string = 'Workspace Name';
  private assignmentGrades: any[] = [];
  assignmentsLength;
  assignmentPageSizeOptions: number[];
  readonly pageSize: number = 10;
  private assignmentsInFolder: any[] = [];
  private assignmentHeader: string;

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  isSettings: boolean;
  isCreated: boolean;
  isRubric: boolean;
  isEditingName: boolean = false;

  rubrics: IRubricName[] = [];


  constructor(private assignmentService: AssignmentService,
              private sakaiService: SakaiService,
              private router: Router,
              private appService: AppService,
              private alertService: AlertService,
              private fileSaverService: FileSaverService,
              private settingsService: SettingsService,
              private importService: ImportService,
              private fb: FormBuilder,
              private electronService: ElectronService) {
  }

  ngOnInit() {
    this.initForm();
    let selectedWorkspace = this.assignmentService.selectedWorkspace;
    if (selectedWorkspace !== null) {
      this.hierarchyModel = selectedWorkspace;
      this.generateDataFromModel();
    }


    // this.importService.getRubricDetails().subscribe((rubrics: IRubricName[]) => {
    //   const data: IRubricName = {name: null, inUse: false};
    //   rubrics.unshift(data);
    //   this.rubrics = rubrics;
    // });

  }

  private initForm() {
  }

  manageFolders(event) {
    // fs.renameSync()
  }


  async getAssignmentSettings(assignmentName: string): Promise<AssignmentSettingsInfo> {
    this.appService.isLoading$.next(true);
    return await this.assignmentService.getAssignmentSettings(this.workspaceName, assignmentName).toPromise()
      .then((assignmentSettings) => {
        this.appService.isLoading$.next(false);
        this.assignmentService.setSelectedAssignment(assignmentSettings);
        return assignmentSettings;
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
    let workspaceRows: WorkspaceDetails[] = [];
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
            curWorkspace: ''
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
          workspaceRows.push(workspaceRow);
        }
      });
      this.dataSource = new MatTableDataSource(workspaceRows);
      this.dataSource.paginator = this.paginator;
      this.assignmentsLength = workspaceRows.length;
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
  };

  private openYesNoConfirmationDialog(title: string = "Confirm", message: string) {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "400px";
    config.data = {
      title: title,
      message: message,
    };
  }

  /**   viewRubric() {
    if (this.assignmentSettings.rubric.name != null) {
      console.log("Open Rubric name = " + this.assignmentSettings.rubric.name);
      let data = {rubricName: this.assignmentSettings.rubric.name};
      //console.log(data);
      this.importService.getRubricContents(data).subscribe((rubric: IRubric) => {
        this.openRubricModalDialog(rubric, this.assignmentSettings);
        this.appService.isLoading$.next(false);
        this.appService.openSnackBar(true, "Rubric View Opened");
      }, error => {
        this.appService.openSnackBar(false, "Rubric View Failed");
        this.appService.isLoading$.next(false)
      });
    }
  }
   private openRubricModalDialog(rubric: IRubric, assignmentSettingsInfo: AssignmentSettingsInfo) {
    const config = new MatDialogConfig();
    config.disableClose = false;
    config.width = "1500px";
    config.height = "750px";
    config.data = {
      rubric: rubric,
      assignmentSettingsInfo: assignmentSettingsInfo,
      assignmentName: this.workspaceName
    };

    let dialogRef = this.appService.createDialog(RubricViewModalComponent, config);
    dialogRef.afterClosed().subscribe(result => {
      this.getAssignmentSettings(this.workspaceName);
    });
  }
   **/

  ngOnDestroy(): void {
    this.assignmentService.setSelectedWorkspace(null);
  }
}