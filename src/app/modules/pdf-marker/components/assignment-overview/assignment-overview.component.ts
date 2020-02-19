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

export interface AssignmentDetails {
  studentName: string;

  studentNumber: string;

  assignment: string

  grade?: number;

  path?: string;

  status?: string;
};

@Component({
  selector: 'pdf-marker-assignment-overview',
  templateUrl: './assignment-overview.component.html',
  styleUrls: ['./assignment-overview.component.scss']
})
export class AssignmentOverviewComponent implements OnInit, OnDestroy {
  private hierarchyModel;
  displayedColumns: string[] = ['studentName', 'assignment', 'grade', 'status'];
  dataSource: MatTableDataSource<AssignmentDetails>;
  assignmentName: string = 'Assignment Name';
  assignmentsLength;
  assignmentPageSizeOptions: number[];
  readonly pageSize: number = 10;
  private assignmentGrades: any[] = [];
  private assignmentHeader: string;
  private readonly submissionFolder = "Submission attachment(s)";

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  readonly regEx = /(.*)\((.+)\)/;
  private subscription: Subscription;
  private settings: SettingInfo;
  private assignmentSettings: AssignmentSettingsInfo;
  private previouslyEmitted: string;
  isSettings: boolean;
  private selectedRubric: string = null;
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
              private fb: FormBuilder) { }

  ngOnInit() {
    this.initForm();
    this.subscription = this.assignmentService.selectedAssignmentChanged().subscribe((selectedAssignment) => {
      if(selectedAssignment !== null) {
        this.hierarchyModel = selectedAssignment;
        this.getAssignmentSettings((Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0] : '');
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

    this.settingsService.getConfigurations().subscribe((configurations: SettingInfo) => {
      if(configurations.defaultPath && configurations.lmsSelection) {
        this.settings = configurations;
        this.isSettings = true;
        if(!this.hierarchyModel && !!this.assignmentService.getSelectedAssignment()) {
          this.hierarchyModel = this.assignmentService.getSelectedAssignment();
          this.getAssignmentSettings((Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0]:'');
        } else {
          this.router.navigate(["/marker"])
        }
      }
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, "Unable to read application settings");
      this.appService.isLoading$.next(false);
    });
  }

  private initForm() {
    this.rubricForm = this.fb.group({
      rubric: [null]
    });

    this.onRubricChange();
  }

  private getAssignmentSettings(assignmentName: string) {
    this.assignmentService.getAssignmentSettings(assignmentName).subscribe((assignmentSettings: AssignmentSettingsInfo) => {
      this.assignmentSettings = assignmentSettings;
      if(this.assignmentSettings.rubric) {
        this.selectedRubric = this.assignmentSettings.rubric.name;
        this.rubricForm.controls.rubric.setValue(this.assignmentSettings.rubric.name);
      } else {
        this.selectedRubric = null;
        this.rubricForm.controls.rubric.setValue(this.selectedRubric);
      }
      this.getGrades();
    }, error => {
      this.appService.openSnackBar(false, "Unable to read assignment settings");
      this.appService.isLoading$.next(false);
    });
  }

  private getGrades() {
    this.assignmentService.getAssignmentGrades().subscribe((grades: any[]) => {
      this.assignmentGrades = grades;
      if(this.assignmentGrades.length > 0) {
        const keys = Object.keys(grades[0]);
        if(keys.length > 0) {
          this.assignmentHeader = keys[0];
            this.generateDataFromModel();
        }
      }
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to read assignment grades file");
    })
  }

  private generateDataFromModel() {
    let values: AssignmentDetails[] = [];
    this.assignmentName = (Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0]:'';
    if(this.hierarchyModel[this.assignmentName]) {
      Object.keys(this.hierarchyModel[this.assignmentName]).forEach(key => {
        if (this.regEx.test(key) && this.sakaiService.getassignmentRootFiles().indexOf(key) === -1) {
          let value: AssignmentDetails = {
            studentName: '',
            studentNumber: '',
            assignment: '',
            grade: 0,
            path: null,
            status: ''
          };
          const matches = this.regEx.exec(key);
          value.studentName = matches[1];
          value.studentNumber = matches[2];
          value.assignment = this.hierarchyModel[this.assignmentName][key][this.submissionFolder] ? Object.keys(this.hierarchyModel[this.assignmentName][key][this.submissionFolder])[0] : '';
          const gradesInfo = this.assignmentGrades.find(gradesInfo => gradesInfo[this.assignmentHeader] === value.studentNumber);
          value.grade = ((gradesInfo && gradesInfo.field5) ? gradesInfo.field5 : 0);
          value.path = (value.assignment) ? this.assignmentName + '/' + key + "/" + this.submissionFolder + "/" + value.assignment : '';
          value.status = ((gradesInfo && gradesInfo.field7) ? gradesInfo.field7 : 'N/A');
          values.push(value);
        }
      });
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
    } else {
      this.router.navigate([RoutesEnum.MARKER]);
    }
  }

  onRubricChange() {
    this.rubricForm.valueChanges.subscribe(value => {
      if(value.rubric !== this.previouslyEmitted && value.rubric !== this.selectedRubric) {
        this.previouslyEmitted = value.rubric;
        this.confirmWithUser();
      }
    })
  }

  private confirmWithUser() {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "400px";
    config.data = {
      title: "Confirmation",
      message: "Changing or attaching a rubric to an assignment will erase previously marked assignment submission, do you wish to continue?",
    };

    const shouldChangeRubricFn = (shouldChangeRubric: boolean) => {
      if(shouldChangeRubric) {
        const {
          rubric
        } = this.rubricForm.value;

        this.updateAssignmentRubric(rubric);
      } else {
        this.rubricForm.controls.rubric.setValue(this.selectedRubric);
      }
      this.previouslyEmitted = undefined;
    };

    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldChangeRubricFn);
  }

  private updateAssignmentRubric(rubricName: string) {
    this.appService.isLoading$.next(true);
    this.assignmentService.updateAssignmentRubric(rubricName, this.assignmentName).subscribe((rubric: IRubric) => {
      this.selectedRubric = (rubric) ? rubric.name:null;
      this.appService.openSnackBar(true, "Successfully updated rubric");
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to update rubric");
    });
  }

  onSelectedPdf(pdfFileLocation: string) {
    this.appService.isLoading$.next(true);
    this.assignmentService.getFile(pdfFileLocation).subscribe(blobData => {
      this.assignmentService.configure(pdfFileLocation, blobData);
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to read file")
    });
  }

  onFinalizeAndExport(event) {
    if(!this.isSettings) {
      event.target.disabled = true;
      return;
    }
    this.openYesNoConfirmationDialog(null, "Are you sure you want to finalise and zip this assignment?");
  }

  private openYesNoConfirmationDialog(title: string = "Confirm", message: string) {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "400px";
    config.data = {
      title: title,
      message: message,
    };

    const shouldFinalizeAndExportFn = (shouldFinalizeAndExport: boolean) => {
      if(shouldFinalizeAndExport) {
        this.appService.isLoading$.next(true);
        this.assignmentService.finalizeAndExport(this.assignmentName).subscribe((events: any) => {
          if(events.type === HttpEventType.Response) {
            this.alertService.success("Successfully exported assignment. You can now upload it to " + this.settings.lmsSelection + ".");
            let zipFileBuffer: Blob = events.body;
            let blob = new Blob([zipFileBuffer], { type: "application/zip"});
            this.fileSaverService.save(blob, this.assignmentName + ".zip");
            this.appService.isLoading$.next(false);
          }
        }, (responseError) => {
          let blob = new Blob([responseError.error], { type: "text/plain"});
          const reader = new FileReader();
          reader.addEventListener('loadend', (e) => {
            try {
              const error = JSON.parse(reader.result.toString());
              this.alertService.error(error.message);
              this.appService.isLoading$.next(false);
            } catch (e) {
              this.alertService.error("Unexpected error occurred!");
              this.appService.isLoading$.next(false);
            }
          });
          reader.readAsText(blob);
        })
      }
    };
    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldFinalizeAndExportFn);
  }



  ngOnDestroy(): void {
    if(!this.subscription.closed)
      this.subscription.unsubscribe();

    console.log(this.router);
    if(this.router.url.endsWith(RoutesEnum.ASSIGNMENT_UPLOAD))
      this.assignmentService.setSelectedAssignment(null);
  }
}
