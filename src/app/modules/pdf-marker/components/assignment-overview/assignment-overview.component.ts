import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from '@sharedModule/services/assignment.service';
import {SakaiService} from '@coreModule/services/sakai.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {AppService} from '@coreModule/services/app.service';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {YesAndNoConfirmationDialogComponent} from '@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {AlertService} from '@coreModule/services/alert.service';
import {HttpErrorResponse, HttpEvent, HttpEventType, HttpResponse} from '@angular/common/http';
import {FileSaverService} from 'ngx-filesaver';
import {SettingsService} from '@pdfMarkerModule/services/settings.service';
import {SettingInfo} from '@pdfMarkerModule/info-objects/setting.info';
import {AssignmentSettingsInfo} from '../../../../../shared/info-objects/assignment-settings.info';
import {RoutesEnum} from '@coreModule/utils/routes.enum';
import {ImportService} from '@pdfMarkerModule/services/import.service';
import {FormBuilder, FormGroup} from '@angular/forms';
import {RubricViewModalComponent} from '@sharedModule/components/rubric-view-modal/rubric-view-modal.component';
import {ElectronService} from '@coreModule/services/electron.service';
import {AppSelectedPathInfo} from '@coreModule/info-objects/app-selected-path.info';
import {SelectionModel} from '@angular/cdk/collections';
import {ShareAssignments} from "../../../../../shared/info-objects/share-assignments";
import {IRubric, IRubricName} from "../../../../../shared/info-objects/rubric.class";
import {RubricService} from "@sharedModule/services/rubric.service";

export interface AssignmentDetails {
  index?: number;

  studentName: string;

  studentNumber: string;

  assignment: string;

  grade?: number;

  path?: string;

  status?: string;
}

@Component({
  selector: 'pdf-marker-assignment-overview',
  templateUrl: './assignment-overview.component.html',
  styleUrls: ['./assignment-overview.component.scss']
})
export class AssignmentOverviewComponent implements OnInit, OnDestroy {
  private hierarchyModel;
  displayedColumns: string[] = ['select', 'studentName', 'assignment', 'grade', 'status'];
  dataSource: MatTableDataSource<AssignmentDetails>;
  assignmentName = 'Assignment Name';
  assignmentsLength;
  assignmentPageSizeOptions: number[];
  readonly pageSize: number = 10;
  private assignmentGrades: any[] = [];
  private assignmentHeader: string;
  private readonly submissionFolder = 'Submission attachment(s)';

  selection = new SelectionModel<AssignmentDetails>(true, []);


  @ViewChild(MatPaginator, {static: true})
  paginator: MatPaginator;

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
  workspace: string;

  constructor(private assignmentService: AssignmentService,
              private sakaiService: SakaiService,
              private router: Router,
              private activatedRoute: ActivatedRoute,
              private appService: AppService,
              private alertService: AlertService,
              private fileSaverService: FileSaverService,
              private settingsService: SettingsService,
              private importService: ImportService,
              private rubricService: RubricService,
              private fb: FormBuilder,
              private electronService: ElectronService) { }

  ngOnInit() {
    this.initForm();
    this.activatedRoute.params.subscribe(params => {
      const id = params['workspaceName'];
      if (id) {
        this.workspace = id;
      }
    });
    this.subscription = this.assignmentService.onAssignmentSourceChange.subscribe((selectedAssignment) => {
      if (selectedAssignment !== null) {
        this.hierarchyModel = selectedAssignment;
        this.getAssignmentSettings((Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0] : '');
      }
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, 'Unable to read selected assignment');
    });

    this.rubricService.getRubricNames().subscribe((rubrics: IRubricName[]) => {
      const data: IRubricName = {name: null, inUse: false};
      rubrics.unshift(data);
      this.rubrics = rubrics;
    });

    this.settingsService.getConfigurations().subscribe((configurations: SettingInfo) => {
      if (configurations.defaultPath && configurations.lmsSelection) {
        this.settings = configurations;
        this.isSettings = true;
        if (!this.hierarchyModel && !!this.assignmentService.getSelectedAssignment()) {
          this.hierarchyModel = this.assignmentService.getSelectedAssignment();
          this.getAssignmentSettings((Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0] : '');
        } else {
          this.router.navigate(['/marker']);
        }
      }
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, 'Unable to read application settings');
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
    this.assignmentService.getAssignmentSettings(this.workspace, assignmentName).subscribe((assignmentSettings: AssignmentSettingsInfo) => {
      this.assignmentSettings = assignmentSettings;
      this.isCreated = this.assignmentSettings.isCreated;
      if (this.assignmentSettings.rubric) {
        this.selectedRubric = this.assignmentSettings.rubric.name;
        this.rubricForm.controls.rubric.setValue(this.assignmentSettings.rubric.name);
        this.isRubric = true;
      } else {
        this.selectedRubric = null;
        this.rubricForm.controls.rubric.setValue(this.selectedRubric);
        this.isRubric = false;
      }
      this.getGrades(this.workspace, assignmentName);
    }, error => {
      this.appService.openSnackBar(false, 'Unable to read assignment settings');
      this.appService.isLoading$.next(false);
    });
  }

  private getGrades(workspace: string, assignmentName: string) {
    this.assignmentService.getAssignmentGrades(workspace, assignmentName).subscribe((grades: any[]) => {
      this.assignmentGrades = grades;
      if (this.assignmentGrades.length > 0) {
        const keys = Object.keys(grades[0]);
        if (keys.length > 0) {
          this.assignmentHeader = keys[0];
          this.generateDataFromModel();
        }
      }
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, 'Unable to read assignment grades file');
    });
  }

  private generateDataFromModel() {
    const values: AssignmentDetails[] = [];
    this.assignmentName = (Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0] : '';
    if (this.hierarchyModel[this.assignmentName]) {
      let index = 0;
      Object.keys(this.hierarchyModel[this.assignmentName]).forEach(key => {
        if (this.regEx.test(key) && this.sakaiService.getAssignmentRootFiles().indexOf(key) === -1) {
          const value: AssignmentDetails = {
            index: index++,
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
          const gradesInfo = this.assignmentGrades.find(grade => grade[this.assignmentHeader].toUpperCase() === value.studentNumber.toUpperCase());
          value.grade = ((gradesInfo && gradesInfo.field5) ? gradesInfo.field5 : 0);
          value.path = (value.assignment) ? this.assignmentName + '/' + key + '/' + this.submissionFolder + '/' + value.assignment : '';
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

        if (i > this.assignmentsLength) {
          break;
        }
      }
      this.assignmentPageSizeOptions = range;
      this.appService.isLoading$.next(false);
    } else {
      this.router.navigate([RoutesEnum.MARKER]);
    }
  }

  onRubricChange() {
    this.rubricForm.valueChanges.subscribe(value => {
      if (value.rubric !== this.previouslyEmitted && value.rubric !== this.selectedRubric) {
        this.previouslyEmitted = value.rubric;
      }
    });
  }

  onSelectedPdf(pdfFileLocation: string) {
    this.appService.isLoading$.next(true);
    if (this.workspace !== undefined) {
      pdfFileLocation = this.workspace + '/' + pdfFileLocation;
    }
    this.assignmentService.getFile(pdfFileLocation).subscribe(blobData => {
      this.assignmentService.configure(pdfFileLocation, blobData);
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, 'Unable to read file');
    });
  }

  onFinalizeAndExport(event) {
    if (!this.isSettings) {
      event.target.disabled = true;
      return;
    }
    this.openYesNoConfirmationDialog(null, 'Are you sure you want to finalise and zip this assignment?');
  }

  private isNullOrUndefined = (object: any): boolean => {
    return (object === null || object === undefined);
  }

  private openYesNoConfirmationDialog(title: string = 'Confirm', message: string) {
    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '400px';
    config.data = {
      title: title,
      message: message,
    };

    const shouldFinalizeAndExportFn = (shouldFinalizeAndExport: boolean) => {
      if (shouldFinalizeAndExport) {
        this.appService.isLoading$.next(true);
        if (!(this.isNullOrUndefined(this.assignmentSettings.rubric))) {
          this.assignmentService.finalizeAndExportRubric(this.workspace, this.assignmentName, this.assignmentSettings.rubric).subscribe((data: Uint8Array) => {
            this.onSuccessfulExport(data);
          }, (responseError) => {
            this.alertService.error(responseError);
            this.appService.isLoading$.next(false);
          });
        } else {
          this.assignmentService.finalizeAndExport(this.workspace, this.assignmentName).subscribe((blob: Uint8Array) => {
            this.onSuccessfulExport(blob);
          }, (responseError) => {
            this.alertService.error(responseError);
            this.appService.isLoading$.next(false);
          });
        }
      }
    };
    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldFinalizeAndExportFn);
  }

  private onSuccessfulExport(blob: Uint8Array) {
    this.alertService.clear();
    const fileName: string = this.assignmentName;
    this.electronService.saveFile({ filename: fileName, buffer: blob, name: 'Zip File', extension: ['zip']}).subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
      this.appService.isLoading$.next(false);
      if (appSelectedPathInfo.selectedPath) {
        this.alertService.success(`Successfully exported ${fileName}. You can now upload it to ${this.settings.lmsSelection}.`);
      } else if (appSelectedPathInfo.error) {
        this.appService.openSnackBar(false, appSelectedPathInfo.error.message);
      }
    });

  }

  manageStudents() {
    if (this.workspace) {
      this.router.navigate([RoutesEnum.ASSIGNMENT_UPLOAD, this.assignmentName, this.workspace]);
    } else {
      this.router.navigate([RoutesEnum.ASSIGNMENT_UPLOAD, this.assignmentName]);
    }
  }

  viewRubric() {
    if (this.assignmentSettings.rubric.name != null) {
      // console.log(data);
      this.rubricService.getRubric(this.assignmentSettings.rubric.name).subscribe((rubric: IRubric) => {
        this.openRubricModalDialog(rubric, this.assignmentSettings);
        this.appService.isLoading$.next(false);
        this.appService.openSnackBar(true, 'Rubric View Opened');
      }, error => {
        this.appService.openSnackBar(false, 'Rubric View Failed');
        this.appService.isLoading$.next(false);
      });
    }
  }

  private openRubricModalDialog(rubric: IRubric, assignmentSettingsInfo: AssignmentSettingsInfo) {
    const config = new MatDialogConfig();
    config.disableClose = false;
    config.width = '1500px';
    config.height = '750px';
    config.data = {
      rubric: rubric,
      assignmentSettingsInfo: assignmentSettingsInfo,
      assignmentName: this.assignmentName
    };

    const dialogRef = this.appService.createDialog(RubricViewModalComponent, config);
    dialogRef.afterClosed().subscribe(result => {
      this.getAssignmentSettings(this.assignmentName);
    });
  }

  ngOnDestroy(): void {
    if (!this.subscription.closed) {
      this.subscription.unsubscribe();
    }

    if (this.router.url.endsWith(RoutesEnum.ASSIGNMENT_UPLOAD)) {
      this.assignmentService.setSelectedAssignment(null);
    }
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: AssignmentDetails): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.index + 1}`;
  }

  share() {
    const shareRequest: ShareAssignments = {
      assignmentName: this.assignmentName,
      workspaceFolder: this.workspace,
      submissions : this.selection.selected.map((selection) => {
        return {
          studentName: selection.studentName,
          studentNumber: selection.studentNumber
        };
      })
    };

    this.appService.isLoading$.next(true);
    this.assignmentService.shareExport(shareRequest).subscribe({
      next: (data) => {
          this.onSuccessfulShareExport(data);
      },
      error: (error) => {
        this.alertService.error(error);
        this.appService.isLoading$.next(false);
      },
      complete: () => {
        this.appService.isLoading$.next(false);
      }
    });
  }

  private onSuccessfulShareExport(data: Uint8Array) {
    this.alertService.clear();
    const fileName: string = this.assignmentName + '_share.zip';
    this.electronService.saveFile({ filename: fileName, buffer: data, name: 'Zip File', extension: ['zip']})
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        this.appService.isLoading$.next(false);
        if (appSelectedPathInfo.selectedPath) {
          this.alertService.success(`Successfully exported ${fileName}.`);
        } else if (appSelectedPathInfo.error) {
          this.appService.openSnackBar(false, appSelectedPathInfo.error.message);
        }
      });
  }
}
