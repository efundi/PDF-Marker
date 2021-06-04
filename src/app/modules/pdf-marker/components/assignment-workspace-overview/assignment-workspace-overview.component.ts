import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {SakaiService} from "@coreModule/services/sakai.service";
import {Router} from "@angular/router";
import {Subscription} from "rxjs";
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
import {RoutesEnum} from "@coreModule/utils/routes.enum";
import {ImportService} from "@pdfMarkerModule/services/import.service";
import {IRubric, IRubricName} from "@coreModule/utils/rubric.class";
import {FormBuilder, FormGroup} from "@angular/forms";
import {RubricViewModalComponent} from "@sharedModule/components/rubric-view-modal/rubric-view-modal.component";
import {ElectronService} from "@coreModule/services/electron.service";
import {file} from "@rxweb/reactive-form-validators";
import {AppSelectedPathInfo} from "@coreModule/info-objects/app-selected-path.info";

export interface AssignmentDetails {
  assignmentTitle: string;

  submissionCount: number;

  hasRubric: string;

  curWorkspace: string;
};

@Component({
  selector: 'pdf-marker-workspace-assignment-overview',
  templateUrl: './assignment-workspace-overview.component.html',
  styleUrls: ['./assignment-workspace-overview.component.scss']
})
export class AssignmentWorkspaceOverviewComponent implements OnInit, OnDestroy {
  private hierarchyModel;
  displayedColumns: string[] = ['assignmentTitle', 'submissionCount', 'hasRubric','curWorkspace'];
  dataSource: MatTableDataSource<AssignmentDetails>;
  assignmentName: string = 'Assignment Name';
  assignmentsLength;
  assignmentPageSizeOptions: number[];
  readonly pageSize: number = 10;
  private assignmentsInFolder: any[] = [];
  private assignmentHeader: string;

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  readonly regEx = /(.*)\((.+)\)/;
  private subscription: Subscription;
  private settings: SettingInfo;
  private assignmentSettings: AssignmentSettingsInfo;
  private previouslyEmitted: string;
  isSettings: boolean;
  isCreated: boolean;
  isRubric: boolean;
  selectedRubric: string = null;
  rubrics: IRubricName[] = [];
  rubricForm: FormGroup;

  constructor(private assignmentService: AssignmentService,
              private sakaiService: SakaiService,
              private router: Router,
              private appService: AppService,
              private alertService: AlertService,
              private fileSaverService: FileSaverService,
              private settingsService: SettingsService,
              private importService: ImportService,
              private fb: FormBuilder,
              private electronService: ElectronService) { }

  ngOnInit() {
    this.appService.isLoading$.next(false);
    this.initForm();
    this.subscription = this.assignmentService.selectedAssignmentChanged().subscribe((selectedAssignment) => {
      if(selectedAssignment !== null) {
        this.hierarchyModel = selectedAssignment;
        this.getAssignmentSettings((Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0] : '');
        this.appService.isLoading$.next(false);
      }
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to read selected assignment");
    });

    this.importService.getRubricDetails().subscribe((rubrics: IRubricName[]) => {
      const data: IRubricName = {name: null, inUse: false};
      rubrics.unshift(data);
      this.rubrics = rubrics;
    });

  }

  private initForm() {
  }

  private getAssignmentSettings(assignmentName: string) {
    this.assignmentService.getAssignmentSettings(assignmentName).subscribe((assignmentSettings: AssignmentSettingsInfo) => {
      this.assignmentSettings = assignmentSettings;
      this.isCreated = this.assignmentSettings.isCreated;
      if(this.assignmentSettings.rubric) {
        this.selectedRubric = this.assignmentSettings.rubric.name;
        this.rubricForm.controls.rubric.setValue(this.assignmentSettings.rubric.name);
        this.isRubric = true;
      } else {
        this.selectedRubric = null;
        this.rubricForm.controls.rubric.setValue(this.selectedRubric);
        this.isRubric = false;
      }
    }, error => {
      this.appService.openSnackBar(false, "Unable to read assignment settings");
      this.appService.isLoading$.next(false);
    });
  }


  private generateDataFromModel() {
    let values: AssignmentDetails[] = [];
    for (let i = 0; i < 3; i++) {
     let value: AssignmentDetails = {
            assignmentTitle: '',
            submissionCount: 0,
            hasRubric: '',
            curWorkspace: '',
          };

          value.assignmentTitle = "Test Assignment";
          value.submissionCount = 10;
          value.hasRubric = "Yes"
          value.curWorkspace = "TestFolder";
          values.push(value);
        }
      this.dataSource = new MatTableDataSource(values);
      this.dataSource.paginator = this.paginator;
      this.assignmentsLength = values.length;
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
      assignmentName: this.assignmentName
    };

    let dialogRef = this.appService.createDialog(RubricViewModalComponent, config);
    dialogRef.afterClosed().subscribe(result => {
      this.getAssignmentSettings(this.assignmentName);
    });
  }
**/
  ngOnDestroy(): void {
    if(!this.subscription.closed)
      this.subscription.unsubscribe();

    if(this.router.url.endsWith(RoutesEnum.ASSIGNMENT_UPLOAD))
      this.assignmentService.setSelectedAssignment(null);
  }
}
