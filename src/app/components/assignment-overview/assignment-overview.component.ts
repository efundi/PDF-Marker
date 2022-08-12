import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild, ViewContainerRef} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {ActivatedRoute, Router} from '@angular/router';
import {forkJoin, mergeMap, Observable, Subscription, tap} from 'rxjs';
import {AppService} from '../../services/app.service';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {
  YesAndNoConfirmationDialogComponent
} from '../yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {AlertService} from '../../services/alert.service';
import {SettingsService} from '../../services/settings.service';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {
  AssignmentSettingsInfo,
  AssignmentState,
  DistributionFormat,
  SourceFormat,
  Submission,
  SubmissionAllocation,
  SubmissionState
} from '@shared/info-objects/assignment-settings.info';
import {RoutesEnum} from '../../utils/routes.enum';
import {ImportService} from '../../services/import.service';
import {UntypedFormBuilder} from '@angular/forms';
import {RubricViewModalComponent} from '../rubric-view-modal/rubric-view-modal.component';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {SelectionModel} from '@angular/cdk/collections';
import {ShareAssignments} from '@shared/info-objects/share-assignments';
import {IRubric, IRubricName} from '@shared/info-objects/rubric.class';
import {RubricService} from '../../services/rubric.service';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {BusyService} from '../../services/busy.service';
import {MatSort, MatSortable} from '@angular/material/sort';
import {cloneDeep, filter, find, forEach, isEmpty, isNil, sortBy} from 'lodash';
import {
  StudentSubmission,
  TreeNodeType,
  Workspace,
  WorkspaceAssignment,
  WorkspaceFile
} from '@shared/info-objects/workspace';
import {DEFAULT_WORKSPACE, MARK_FILE} from '@shared/constants/constants';
import {AllocateMarkersModalComponent} from './allocate-markers-modal/allocate-markers-modal.component';
import {DateTime} from 'luxon';

export interface AssignmentDetails {
  index?: number;
  fullName?: string;
  studentName: string;

  studentSurname: string;

  studentNumber: string;

  assignment: string;

  grade?: number;

  state?: string;

  lmsStatusText?: string;

  date?: string;
  time?: string;

  submissionDirectoryName?: string;

  pdfFile: WorkspaceFile;

  marker?: string;
}

@Component({
  selector: 'pdf-marker-assignment-overview',
  templateUrl: './assignment-overview.component.html',
  styleUrls: ['./assignment-overview.component.scss']
})
export class AssignmentOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  displayedColumns: string[] = ['select', 'fullName', 'assignment', 'grade', 'date', 'state', 'marker', 'lmsStatusText'];
  dataSource = new MatTableDataSource<AssignmentDetails>([]);
  assignmentsLength;
  selection = new SelectionModel<AssignmentDetails>(true, []);


  @ViewChild(MatPaginator, {static: true})
  paginator: MatPaginator;

  @ViewChild(MatSort, {static: true})
  sort: MatSort;

  SubmissionState = SubmissionState;
  AssignmentState = AssignmentState;
  SourceFormat = SourceFormat;

  private subscription: Subscription;
  private sortSubscription: Subscription;
  private settings: SettingInfo;
  assignmentSettings: AssignmentSettingsInfo;
  private workspaceAssignment: WorkspaceAssignment;
  isSettings: boolean;
  rubrics: IRubricName[] = [];

  private workspaceName: string;
  assignmentName: string;
  isAssignmentOwner = false;

  constructor(private assignmentService: AssignmentService,
              private router: Router,
              private activatedRoute: ActivatedRoute,
              private appService: AppService,
              private alertService: AlertService,
              private settingsService: SettingsService,
              private importService: ImportService,
              private busyService: BusyService,
              private rubricService: RubricService,
              private fb: UntypedFormBuilder,
              private viewContainerRef: ViewContainerRef,
              private dialog: MatDialog) {
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

        this.workspaceName = params['workspaceName'] || DEFAULT_WORKSPACE;
        this.assignmentName = params['id'];
        this.refresh();
      },
      error: () => {
        this.busyService.stop();
        this.appService.openSnackBar(false, 'Unable to read selected assignment');
      }
    });
  }

  private refresh(): void {
    this.busyService.start();
    this.getAssignmentSettings().pipe(
      mergeMap(() => this.getAssignmentHierarchy())
    ).subscribe({
      next: () => {
        this.generateDataFromModel();
        this.busyService.stop();
      },
      error:  () => {
        this.appService.openSnackBar(false, 'Unable to read assignment settings');
        this.busyService.stop();
      }
    });
  }

  private getAssignmentSettings(): Observable<AssignmentSettingsInfo> {
    return this.assignmentService.getAssignmentSettings(this.workspaceName, this.assignmentName)
      .pipe(
        tap((assignmentSettings: AssignmentSettingsInfo) => {
          this.assignmentSettings = assignmentSettings;
        })
      );
  }

  private getAssignmentHierarchy(): Observable<WorkspaceAssignment> {
    return this.assignmentService.getAssignmentHierarchy(this.workspaceName, this.assignmentName)
      .pipe(
        tap((workspaceAssignment) => {
          this.workspaceAssignment = workspaceAssignment;
        })
      );
  }

  private calculateIsAssignmentOwner(): boolean {
    const isStandalone = this.assignmentSettings.distributionFormat === DistributionFormat.STANDALONE;
    let isOwner = true;
    if (!isStandalone) {
      const user = this.settings.user;
      isOwner = !isNil(user) && this.assignmentSettings.owner.id === this.settings.user.id;
    }
    return isStandalone || isOwner;
  }

  private generateDataFromModel() {
    const values: AssignmentDetails[] = [];
    if (!isNil(this.workspaceAssignment)) {
      this.isAssignmentOwner = this.calculateIsAssignmentOwner();

      let index = 0;
      const selfId = this.settings.user ? this.settings.user.id : null;
      filter(this.workspaceAssignment.children, {type: TreeNodeType.SUBMISSION}).forEach((workspaceSubmission: StudentSubmission) => {

        const submission: Submission = find(this.assignmentSettings.submissions, {directoryName: workspaceSubmission.name});
        const fullName = workspaceSubmission.studentSurname + (isNil(workspaceSubmission.studentName) ? '' : ', ' + workspaceSubmission.studentName);
        let markerName: string;
        if (submission.allocation) {

          if (submission.allocation.id === selfId) {
            markerName = 'Me';
          } else {
            const marker = find(this.settings.markers, {id: submission.allocation.id});
            if (!isNil(marker)) {
              markerName = marker.name;
            }
          }
        }
        const value: AssignmentDetails = {
          submissionDirectoryName: workspaceSubmission.name,
          index: index++,
          fullName,
          studentName: workspaceSubmission.studentName,
          studentSurname: workspaceSubmission.studentSurname,
          studentNumber: workspaceSubmission.studentId,
          assignment: '',
          grade: submission.mark,
          pdfFile: null,
          lmsStatusText: submission.lmsStatusText ? submission.lmsStatusText : 'N/A',
          marker: markerName ? markerName : '',
          state: submission.state

        };
        const submissionDirectory = find(workspaceSubmission.children, {type: TreeNodeType.SUBMISSIONS_DIRECTORY});
        const feedbackDirectory = find(workspaceSubmission.children, {type: TreeNodeType.FEEDBACK_DIRECTORY});
        const marksFile = find(workspaceSubmission.children, (c => c.name === MARK_FILE));
        if (marksFile) {
          value.date = DateTime.fromJSDate(marksFile.dateModified).toFormat('d MMMM yyyy');
          value.time = DateTime.fromJSDate(marksFile.dateModified).toFormat('HH:mm:ss');
        }
        if (submissionDirectory && submissionDirectory.children.length > 0) {
          value.pdfFile = submissionDirectory.children[0] as WorkspaceFile;
        } else if (feedbackDirectory && feedbackDirectory.children.length > 0) {
          value.pdfFile = feedbackDirectory.children[0] as WorkspaceFile;
        }
        if (!isNil(value.pdfFile)) {
          value.assignment = value.pdfFile.name;
        }
        values.push(value);
      });
      this.dataSource.data = sortBy(values, 'fullName');
      this.assignmentsLength = values.length;
    } else {
      this.router.navigate([RoutesEnum.MARKER]);
    }
  }


  onSelectedPdf(element: AssignmentDetails) {
    if (isNil(element.pdfFile)) {
      return;
    }
    const pdfFile = element.pdfFile;
    const assignment = pdfFile.parent.parent.parent as WorkspaceAssignment;
    const workspace = assignment.parent as Workspace;
    const pdfPath = PdfmUtilsService.buildTreePath(pdfFile);

    this.assignmentService.selectSubmission({
      workspace,
      assignment,
      pdfFile
    });

    const selfId = this.settings.user ? this.settings.user.id : null;
    const submission = find(this.assignmentSettings.submissions, {studentId: element.studentNumber});
    const canMark = isNil(submission.allocation) || submission.allocation.id === selfId;

    if (this.assignmentSettings.state !== AssignmentState.FINALIZED && (this.assignmentSettings.state === AssignmentState.SENT_FOR_REVIEW || canMark)) {
      this.router.navigate([
        RoutesEnum.ASSIGNMENT_MARKER,
        workspace.name,
        assignment.name,
        pdfPath]);
    } else {
      this.router.navigate([
        RoutesEnum.PDF_VIEWER,
        workspace.name,
        assignment.name,
        pdfPath]);
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
          this.refresh();
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
      this.refresh();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
        this.saveData(data, this.assignmentName + '_share.zip');
        this.busyService.stop();
      },
      error: (error) => {
        this.alertService.error(error);
        this.busyService.stop();
      }
    });
  }

  private saveData(data: Uint8Array, filename: string) {
    this.alertService.clear();
    this.busyService.start();
    this.appService.saveFile({ filename, buffer: data, name: 'Zip File', extension: ['zip']})
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        this.busyService.stop();
        if (appSelectedPathInfo.selectedPath) {
          this.alertService.success(`Successfully exported ${filename}.`);
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

  allocateMarkers(): void {
    const config = new MatDialogConfig();
    config.width = '600px';
    config.maxWidth = '800px';
    config.disableClose = true;
    config.data = {
      assignmentName: this.assignmentName,
      workspaceName: this.workspaceName,
      assignmentSettings: this.assignmentSettings,
      workspaceAssignment: this.workspaceAssignment
    };

    const dialogRef = this.appService.createDialog(AllocateMarkersModalComponent, config);
    dialogRef.afterClosed().subscribe((allocations: SubmissionAllocation[]) => {
      if (isEmpty(allocations)) {
        return; // Nothing to do if there is no allocations
      }
      const settings = cloneDeep(this.assignmentSettings);
      settings.owner = {
        id: this.settings.user.id,
        email: this.settings.user.email,
      };
      settings.distributionFormat = DistributionFormat.DISTRIBUTED;
      allocations.forEach((allocation) => {
        const submission = find(settings.submissions, {directoryName: allocation.submission});
        submission.allocation = allocation.marker;
        submission.state = SubmissionState.ASSIGNED_TO_MARKER;
      });
      this.updateAssignmentSettings(settings);
    });
  }

  private updateAssignmentSettings(assignmentSettings: AssignmentSettingsInfo) {
    this.busyService.start();
    this.assignmentService.updateAssignmentSettings(assignmentSettings, this.workspaceName, this.assignmentName)
      .subscribe({
        next: () => {
          this.refresh();
          this.busyService.stop();
        },
        error: (error) => {
          this.alertService.error(error);
          this.busyService.stop();
        }
      });
  }

  private checkAllSubmissionsMarked(): boolean {
    let marked = true;
    forEach(this.assignmentSettings.submissions, ( submission) => {
      marked = submission.state === SubmissionState.MARKED;
      return marked;
    });
    return marked;
  }

  private exportForReview() {
    this.busyService.start();
    this.assignmentService.exportForReview(this.workspaceName, this.assignmentName).subscribe({
      next: (buffer) => {
        this.saveData(buffer, this.assignmentName + '_marked.zip');
        this.refresh();
        this.busyService.stop();
      },
      error: () => {
        this.busyService.stop();
      }
    });
  }

  onExportForReview($event: MouseEvent) {
    const allMarked = this.checkAllSubmissionsMarked();
    if (!allMarked) {
      const config = new MatDialogConfig();
      config.width = '400px';
      config.maxWidth = '400px';
      config.data = {
        title: 'Export for review',
        message: 'You are about to export the assignment for review, the assignment will be locked for marking after export. There are un-marked submissions, do you want to continue?',
      };
      this.dialog.open(YesAndNoConfirmationDialogComponent, config).afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.exportForReview();
        }
      });
    } else {
      this.exportForReview();
    }
  }
}
