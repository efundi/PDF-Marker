import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild, ViewContainerRef} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {ActivatedRoute, Router} from '@angular/router';
import {forkJoin, Observable, Subscription, tap} from 'rxjs';
import {AppService} from '../../services/app.service';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {
  YesAndNoConfirmationDialogComponent
} from '../yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {AlertService} from '../../services/alert.service';
import {SettingsService} from '../../services/settings.service';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {RoutesEnum} from '../../utils/routes.enum';
import {ImportService} from '../../services/import.service';
import {FormBuilder, FormGroup} from '@angular/forms';
import {RubricViewModalComponent} from '../rubric-view-modal/rubric-view-modal.component';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {SelectionModel} from '@angular/cdk/collections';
import {ShareAssignments} from '@shared/info-objects/share-assignments';
import {IRubric, IRubricName} from '@shared/info-objects/rubric.class';
import {RubricService} from '../../services/rubric.service';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {BusyService} from '../../services/busy.service';
import {MatSort, MatSortable, Sort} from '@angular/material/sort';
import {filter, find, isNil, sortBy} from 'lodash';
import {StudentSubmission, TreeNodeType} from '@shared/info-objects/workspace';
import * as _moment from 'moment';
import {FEEDBACK_FOLDER, MARK_FILE, SUBMISSION_FOLDER} from '@shared/constants/constants';
const moment = _moment;

export interface AssignmentDetails {
  index?: number;
  fullName?: string;
  studentName: string;

  studentSurname: string;

  studentNumber: string;

  assignment: string;

  grade?: number;

  path?: string;

  status?: string;

  date?: string;

  action?: 'view' | 'mark';

  submissionDirectoryName?: string;
}

@Component({
  selector: 'pdf-marker-assignment-overview',
  templateUrl: './assignment-overview.component.html',
  styleUrls: ['./assignment-overview.component.scss']
})
export class AssignmentOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  displayedColumns: string[] = ['select', 'fullName', 'assignment', 'grade', 'date', 'status'];
  dataSource = new MatTableDataSource([]);
  assignmentsLength;
  assignmentPageSizeOptions: number[];
  readonly pageSize: number = 10;
  private assignmentGrades: any[] = [];
  private assignmentHeader: string;

  selection = new SelectionModel<AssignmentDetails>(true, []);


  @ViewChild(MatPaginator, {static: true})
  paginator: MatPaginator;

  @ViewChild(MatSort, {static: true})
  sort: MatSort;


  readonly regEx = /(.*)\((.+)\)/;
  private subscription: Subscription;
  private rubricSubscription: Subscription;
  private sortSubscription: Subscription;
  private settings: SettingInfo;
  private assignmentSettings: AssignmentSettingsInfo;
  private previouslyEmitted: string;
  isSettings: boolean;
  isCreated: boolean;
  isRubric: boolean;
  selectedRubric: string = null;
  rubrics: IRubricName[] = [];
  rubricForm: FormGroup;

  private workspaceName: string;
  assignmentName: string;

  constructor(private assignmentService: AssignmentService,
              private router: Router,
              private activatedRoute: ActivatedRoute,
              private appService: AppService,
              private alertService: AlertService,
              private settingsService: SettingsService,
              private importService: ImportService,
              private busyService: BusyService,
              private rubricService: RubricService,
              private fb: FormBuilder,
              private viewContainerRef: ViewContainerRef) {
  }


  private loadRubrics(): Observable<IRubricName[]> {
    return this.rubricService.getRubricNames()
      .pipe(
        tap((rubrics) => {
          const data: IRubricName = {name: null, inUse: false};
          rubrics.unshift(data);
          this.rubrics = rubrics;
        })
      );
  }

  private loadSettings(): Observable<SettingInfo> {
    return this.settingsService.getConfigurations()
      .pipe(
        tap(settings => {
          this.settings = settings;
          if (settings.defaultPath && settings.lmsSelection) {
            this.isSettings = true;
          }
        })
      );
  }

  ngOnInit() {
    this.busyService.start();
    this.initForm();

    forkJoin([
      this.loadRubrics(),
      this.loadSettings()
    ]).subscribe({
      complete: () => {
        this.busyService.stop();
      },
      error: () => this.busyService.stop()
    });

    this.subscription = this.activatedRoute.params.subscribe({
      next: (params) => {

        this.workspaceName = params['workspaceName'];
        this.assignmentName = params['id'];
        this.getAssignmentSettings();
      },
      error: () => {
        this.busyService.stop();
        this.appService.openSnackBar(false, 'Unable to read selected assignment');
      }
    });
  }

  private initForm() {
    this.rubricForm = this.fb.group({
      rubric: [null]
    });


    this.rubricSubscription = this.rubricForm.valueChanges.subscribe(value => this.onRubricChange(value));
  }

  private getAssignmentSettings() {
    this.busyService.start();
    this.assignmentService.getAssignmentSettings(this.workspaceName, this.assignmentName)
      .subscribe({
        next: (assignmentSettings: AssignmentSettingsInfo) => {
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
          this.getGrades(this.workspaceName, this.assignmentName);
          this.busyService.stop();
        },
        error:  () => {
          this.appService.openSnackBar(false, 'Unable to read assignment settings');
          this.busyService.stop();
        }
      });
  }

  private getGrades(workspace: string, assignmentName: string) {
    this.busyService.start();
    this.assignmentService.getAssignmentGrades(workspace, assignmentName).subscribe({
      next: (grades: any[]) => {
        this.assignmentGrades = grades;
        if (this.assignmentGrades.length > 0) {
          const keys = Object.keys(grades[0]);
          if (keys.length > 0) {
            this.assignmentHeader = keys[0];
            this.generateDataFromModel();
          }
        }
        this.busyService.stop();
      },
      error:  (error) => {
        this.appService.openSnackBar(false, 'Unable to read assignment grades file');
        this.busyService.stop();
      }
    });
  }

  private generateDataFromModel() {
    const values: AssignmentDetails[] = [];
    this.assignmentService.getAssignmentHierarchy(this.workspaceName, this.assignmentName).subscribe((workspaceAssignment) => {

      if (!isNil(workspaceAssignment)) {
        let index = 0;
        filter(workspaceAssignment.children, {type: TreeNodeType.SUBMISSION}).forEach((workspaceSubmission: StudentSubmission) => {

          const fullName = workspaceSubmission.studentSurname + (isNil(workspaceSubmission.studentName) ? '' : ', ' + workspaceSubmission.studentName);

          const value: AssignmentDetails = {
            submissionDirectoryName: workspaceSubmission.name,
            index: index++,
            fullName,
            studentName: workspaceSubmission.studentName,
            studentSurname: workspaceSubmission.studentSurname,
            studentNumber: workspaceSubmission.studentId,
            assignment: '',
            grade: 0,
            path: null,
            status: '',
          };
          const submissionDirectory = find(workspaceSubmission.children, {type: TreeNodeType.SUBMISSIONS_DIRECTORY});
          const feedbackDirectory = find(workspaceSubmission.children, {type: TreeNodeType.FEEDBACK_DIRECTORY});
          const marksFile = find(workspaceSubmission.children, (c => c.name === MARK_FILE));
          if (marksFile) {
            value.date = moment(marksFile.dateModified).format('YYYY-MM-DD HH:mm:ss');
          }

          let pdf = '';
          let pdfPath = '';
          let action;
          if (submissionDirectory && submissionDirectory.children.length > 0) {
            pdf = submissionDirectory.children[0].name;
            pdfPath = PdfmUtilsService.buildFilePath(this.workspaceName, this.assignmentName, workspaceSubmission.name, SUBMISSION_FOLDER, pdf);
            action = 'mark';
          } else if (feedbackDirectory && feedbackDirectory.children.length > 0) {
            pdf = feedbackDirectory.children[0].name;
            pdfPath = PdfmUtilsService.buildFilePath(this.workspaceName, this.assignmentName, workspaceSubmission.name, FEEDBACK_FOLDER, pdf);
            action = 'view';
          }
          value.assignment = pdf;
          const gradesInfo = this.assignmentGrades
            .find(grade => grade[this.assignmentHeader].toUpperCase() === value.studentNumber.toUpperCase());
          value.grade = ((gradesInfo && gradesInfo.field5) ? gradesInfo.field5 : 0);
          value.path = pdfPath;
          value.status = ((gradesInfo && gradesInfo.field7) ? gradesInfo.field7 : 'N/A');
          value.action = action;
          values.push(value);
        });
        this.dataSource.data = sortBy(values, 'fullName');
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
      } else {
        this.router.navigate([RoutesEnum.MARKER]);
      }
    });
  }

  onRubricChange(value) {
    if (value.rubric !== this.previouslyEmitted && value.rubric !== this.selectedRubric) {
      this.previouslyEmitted = value.rubric;
    }
  }

  onSelectedPdf(element: AssignmentDetails) {
    this.assignmentService.selectSubmission({
      workspaceName: PdfmUtilsService.defaultWorkspaceName(this.workspaceName),
      assignmentName: this.assignmentName,
      pdfPath: element.path
    });

    if (element.action === 'mark') {
      this.router.navigate([
        RoutesEnum.ASSIGNMENT_MARKER,
        PdfmUtilsService.defaultWorkspaceName(this.workspaceName),
        this.assignmentName,
        element.path]);
    } else {
      this.router.navigate([
        RoutesEnum.PDF_VIEWER,
        PdfmUtilsService.defaultWorkspaceName(this.workspaceName),
        this.assignmentName,
        element.path]);
    }
  }

  onFinalizeAndExport(event) {
    if (!this.isSettings) {
      event.target.disabled = true;
      return;
    }
    this.openYesNoConfirmationDialog(null, 'Are you sure you want to finalise and zip this assignment?');
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
        this.busyService.start();
        if (!isNil(this.assignmentSettings.rubric)) {
          this.assignmentService.finalizeAndExportRubric(this.workspaceName, this.assignmentName, this.assignmentSettings.rubric)
            .subscribe({
              next: (data: Uint8Array) => {
                this.onSuccessfulExport(data);
              },
              error: (responseError) => {
                this.alertService.error(responseError);
                this.busyService.stop();
              }
            });
        } else {
          this.assignmentService.finalizeAndExport(this.workspaceName, this.assignmentName).subscribe({
            next: (blob: Uint8Array) => {
              this.onSuccessfulExport(blob);
            },
            error: (responseError) => {
              this.alertService.error(responseError);
              this.busyService.stop();
            }
          });
        }
      }
    };
    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldFinalizeAndExportFn);
  }

  private onSuccessfulExport(blob: Uint8Array) {
    this.alertService.clear();
    const fileName: string = this.assignmentName;
    this.appService.saveFile({ filename: fileName, buffer: blob, name: 'Zip File', extension: ['zip']})
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        if (appSelectedPathInfo.selectedPath) {
          this.alertService.success(`Successfully exported ${fileName}. You can now upload it to ${this.settings.lmsSelection}.`);
        } else if (appSelectedPathInfo.error) {
          this.appService.openSnackBar(false, appSelectedPathInfo.error.message);
        }

        this.assignmentService.refreshWorkspaces().subscribe(() => {
          this.busyService.stop();
          this.getAssignmentSettings();
        });
      });

  }

  manageStudents() {
    if (this.workspaceName) {
      this.router.navigate([RoutesEnum.ASSIGNMENT_UPLOAD, this.assignmentName, this.workspaceName]);
    } else {
      this.router.navigate([RoutesEnum.ASSIGNMENT_UPLOAD, this.assignmentName]);
    }
  }

  viewRubric() {
    if (this.assignmentSettings.rubric.name != null) {
      this.rubricService.getRubric(this.assignmentSettings.rubric.name).subscribe({
        next: (rubric: IRubric) => {
          this.openRubricModalDialog(rubric, this.assignmentSettings);
        },
        error: () => {
          this.appService.openSnackBar(false, 'Rubric View Failed');
        }
      });
    }
  }

  private openRubricModalDialog(rubric: IRubric, assignmentSettingsInfo: AssignmentSettingsInfo) {
    const config = new MatDialogConfig();
    config.disableClose = false;
    config.viewContainerRef = this.viewContainerRef;
    config.data = {
      rubric: rubric,
      assignmentSettingsInfo: assignmentSettingsInfo,
      assignmentName: this.assignmentName,
      workspaceName: this.workspaceName
    };

    const dialogRef = this.appService.createDialog(RubricViewModalComponent, config);
    dialogRef.afterClosed().subscribe(() => {
      this.getAssignmentSettings();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.rubricSubscription.unsubscribe();
    this.sortSubscription.unsubscribe();
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
      workspaceFolder: this.workspaceName,
      submissions : this.selection.selected.map((selection) => {
        return {
          directoryName: selection.submissionDirectoryName,
          studentName: selection.studentName,
          studentNumber: selection.studentNumber
        };
      })
    };

    this.busyService.start();
    this.assignmentService.shareExport(shareRequest).subscribe({
      next: (data) => {
        this.onSuccessfulShareExport(data);
        this.busyService.stop();
      },
      error: (error) => {
        this.alertService.error(error);
        this.busyService.stop();
      }
    });
  }

  private onSuccessfulShareExport(data: Uint8Array) {
    this.alertService.clear();
    this.busyService.start();
    const fileName: string = this.assignmentName + '_share.zip';
    this.appService.saveFile({ filename: fileName, buffer: data, name: 'Zip File', extension: ['zip']})
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        this.busyService.stop();
        if (appSelectedPathInfo.selectedPath) {
          this.alertService.success(`Successfully exported ${fileName}.`);
        } else if (appSelectedPathInfo.error) {
          this.appService.openSnackBar(false, appSelectedPathInfo.error.message);
        }
      });
  }

  ngAfterViewInit() {
    this.sortSubscription = this.sort.sortChange.subscribe((change) => {
      localStorage.setItem('assignment-overview-sort', JSON.stringify({
        id: change.active,
        start: change.direction
      }));
    });

    const value = localStorage.getItem('assignment-overview-sort');
    let sort: MatSortable = {id: 'fullName', start: 'asc'} as MatSortable;
    if (!isNil(value)) {
      try {
        sort = JSON.parse(value);
      } catch (e) {}
    }
    this.sort.sort(sort);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }
}
