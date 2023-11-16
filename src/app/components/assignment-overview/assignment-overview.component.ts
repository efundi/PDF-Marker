import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild, ViewContainerRef} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {ActivatedRoute, Router} from '@angular/router';
import {forkJoin, mergeMap, Observable, Subscription, tap, of} from 'rxjs';
import {AppService} from '../../services/app.service';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../confirmation-dialog/confirmation-dialog.component';
import {AlertService} from '../../services/alert.service';
import {SettingsService} from '../../services/settings.service';
import {Marker, SettingInfo} from '@shared/info-objects/setting.info';
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
import {ExportAssignmentsRequest, ExportFormat} from '@shared/info-objects/export-assignments-request';
import {IRubric, IRubricName} from '@shared/info-objects/rubric.class';
import {RubricService} from '../../services/rubric.service';
import {BusyService} from '../../services/busy.service';
import {MatSort, MatSortable} from '@angular/material/sort';
import {cloneDeep, every, filter, find, forEach, isEmpty, isNil, map, some, sortBy, uniq} from 'lodash';
import {
  StudentSubmissionTreeNode,
  TreeNodeType,
  AssignmentTreeNode,
  WorkspaceFileTreeNode
} from '@shared/info-objects/workspaceTreeNode';
import {DEFAULT_WORKSPACE, MARK_FILE} from '@shared/constants/constants';
import {AllocateMarkersModalComponent} from './allocate-markers-modal/allocate-markers-modal.component';
import {DateTime} from 'luxon';
import {
  calculateCanModerateSubmission,
  calculateCanReAllocateSubmission,
  checkPermissions, DEFAULT_PERMISSIONS,
  Permissions
} from '../../utils/utils';
import {ImportMarkerModalComponent} from './import-marker-modal/import-marker-modal.component';
import {LectureImportInfo} from '@shared/info-objects/lecture-import.info';
import {
  ReallocateSubmissionsModalComponent
} from './reallocate-submissions-modal/reallocate-submissions-modal.component';
import {WorkspaceService} from '../../services/workspace.service';
import {SubmissionNavigationService} from '../../services/submission-navigation.service';

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

  pdfFile: WorkspaceFileTreeNode;

  marker?: string;
  canReAllocate?: boolean;
  canModerate?: boolean;
}

@Component({
  selector: 'pdf-marker-assignment-overview',
  templateUrl: './assignment-overview.component.html',
  styleUrls: ['./assignment-overview.component.scss']
})
export class AssignmentOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  displayedColumns: string[] = [/*'select', */'fullName', 'assignment', 'grade', 'date', 'state', 'marker', 'lmsStatusText'];
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
  private workspaceAssignment: AssignmentTreeNode;
  isSettings: boolean;
  rubrics: IRubricName[] = [];

  private workspaceName: string;
  assignmentName: string;
  permissions: Permissions = DEFAULT_PERMISSIONS();

  constructor(private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService,
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
              private dialog: MatDialog,
              private submissionNavigationService: SubmissionNavigationService) {
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
          if (settings.lmsSelection) {
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
    this.selection.clear();
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

  private getAssignmentHierarchy(): Observable<AssignmentTreeNode> {
    return this.assignmentService.getAssignmentHierarchy(this.workspaceName, this.assignmentName)
      .pipe(
        tap((workspaceAssignment) => {
          this.workspaceAssignment = workspaceAssignment;
        })
      );
  }

  private generateDataFromModel() {
    const values: AssignmentDetails[] = [];
    if (!isNil(this.workspaceAssignment)) {
      this.permissions = checkPermissions(this.assignmentSettings, this.settings.user);
      const hasSelectors = this.displayedColumns[0] === 'select';
      if ((this.permissions.canReAllocate || this.permissions.canSendForModeration) && !hasSelectors) {
        this.displayedColumns.unshift('select');
      } else if (!(this.permissions.canReAllocate || this.permissions.canSendForModeration) && hasSelectors) {
        this.displayedColumns.shift();
      }
      let index = 0;
      const selfEmail = this.settings.user ? this.settings.user.email : null;
      const selfId = this.settings.user ? this.settings.user.id : null;
      filter(this.workspaceAssignment.children, {type: TreeNodeType.SUBMISSION}).forEach((workspaceSubmission: StudentSubmissionTreeNode) => {

        const submission: Submission = find(this.assignmentSettings.submissions, {directoryName: workspaceSubmission.name});
        const fullName = workspaceSubmission.studentSurname + (isNil(workspaceSubmission.studentName) ? '' : ', ' + workspaceSubmission.studentName);
        let markerName: string;
        if (submission.allocation) {

          if (submission.allocation.id === selfId || submission.allocation.email === selfEmail) {
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
          state: submission.state,
          canReAllocate: calculateCanReAllocateSubmission(submission),
          canModerate: calculateCanModerateSubmission(submission),
        };
        const submissionDirectory = find(workspaceSubmission.children, {type: TreeNodeType.SUBMISSIONS_DIRECTORY});
        const feedbackDirectory = find(workspaceSubmission.children, {type: TreeNodeType.FEEDBACK_DIRECTORY});
        const marksFile = find(workspaceSubmission.children, (c => c.name === MARK_FILE));
        if (marksFile) {
          value.date = DateTime.fromJSDate(marksFile.dateModified).toFormat('d MMMM yyyy');
          value.time = DateTime.fromJSDate(marksFile.dateModified).toFormat('HH:mm:ss');
        }
        if (submissionDirectory && submissionDirectory.children.length > 0) {
          value.pdfFile = submissionDirectory.children[0] as WorkspaceFileTreeNode;
        } else if (feedbackDirectory && feedbackDirectory.children.length > 0) {
          value.pdfFile = feedbackDirectory.children[0] as WorkspaceFileTreeNode;
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
    this.submissionNavigationService.openSubmission(element.pdfFile).subscribe();;
  }

  onFinalizeAndExport(event) {
    if (!this.isSettings) {
      event.target.disabled = true;
      return;
    }

    let message = 'Are you sure you want to finalise and zip this assignment?';
    const anyNotMarked = some(this.assignmentSettings.submissions, (s) => s.state === SubmissionState.NOT_MARKED);
    if (anyNotMarked) {
      message = 'There are submissions that are not marked. ' + message;
    }

    this.openYesNoConfirmationDialog(null, message);
  }

  private openYesNoConfirmationDialog(title: string = 'Confirm', message: string) {
    const config = new MatDialogConfig<ConfirmationDialogData>();
    config.width = '400px';
    config.maxWidth = '400px';
    config.data = {
      title: title,
      message: message,
    };

    this.dialog.open(ConfirmationDialogComponent, config).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.appService.saveFile({
          filename: this.assignmentName + '.zip',
          filters: [{
            name: 'Zip File',
            extensions: ['zip']
          }]
        }).subscribe((selectedPath) => {

          if (selectedPath) {
            this.busyService.start();
            this.assignmentService.finalizeAndExport(this.workspaceName, this.assignmentName, selectedPath.selectedPath).subscribe({
              next: (outputPath: string) => {
                this.alertService.success(`Successfully exported to ${outputPath}. You can now upload it to ${this.settings.lmsSelection}.`);
                this.workspaceService.refreshWorkspaces().subscribe(() => {
                  this.busyService.stop();
                  this.refresh();
                });
              },
              error: (responseError) => {
                this.alertService.error(responseError);
                this.busyService.stop();
              }
            });
          }

        });


      }
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

  private canReAllocateOrModerate(row: AssignmentDetails): boolean {
    return  (this.permissions.canReAllocate && row.canReAllocate) ||
      (this.permissions.canSendForModeration && row.canModerate);
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.filter((r) => this.canReAllocateOrModerate(r)).length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data.filter((r) => this.canReAllocateOrModerate(r)));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: AssignmentDetails): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.index + 1}`;
  }

  exportForModeration() {


    const allMatch = every(this.selection.selected, (s) => s.canModerate);
    if (!allMatch) {
      const confirmationModalConfig = new MatDialogConfig<ConfirmationDialogData>();
      confirmationModalConfig.width = '600px';
      confirmationModalConfig.maxWidth = '800px';
      confirmationModalConfig.disableClose = true;
      confirmationModalConfig.data = {
        yesText: 'Ok',
        title: 'Invalid selection',
        message: 'Some of the selected submissions cannot be sent for moderation',
        showNo: false
      };
      this.appService.createDialog(ConfirmationDialogComponent, confirmationModalConfig).afterClosed().subscribe({
        next: () => this.busyService.stop()
      });

      return;
    }

    const confirmExportConfig = new MatDialogConfig<ConfirmationDialogData>();
    confirmExportConfig.width = '600px';
    confirmExportConfig.maxWidth = '800px';
    confirmExportConfig.disableClose = true;
    confirmExportConfig.data = {
      title: 'Export for Moderation',
      message: 'Are you sure you want to send these ' + this.selection.selected.length + ' submissions for moderation?',
    };
    this.appService.createDialog(ConfirmationDialogComponent, confirmExportConfig).afterClosed().subscribe({
      next: (confirmed) => {
        if (!confirmed) {
          return;
        }
        this.busyService.start();
        this.appService.saveFile({
          filename: this.assignmentName + '_moderation.zip',
          filters: [{
            name: 'Zip File',
            extensions: ['zip']
          }]
        }).subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
          if (isNil(appSelectedPathInfo.selectedPath)) {
            this.busyService.stop();
            return;
          }
          const studentIds = map(this.selection.selected, 'studentNumber');
          const shareRequest: ExportAssignmentsRequest = {
            format: ExportFormat.MODERATION,
            assignmentName: this.assignmentName,
            workspaceFolder: this.workspaceName,
            studentIds,
            zipFilePath: appSelectedPathInfo.selectedPath
          };

          const updateSettings = cloneDeep(this.assignmentSettings);
          forEach(studentIds, (studentId) => {
            const submission = find(updateSettings.submissions, {studentId});
            submission.state = SubmissionState.SENT_FOR_MODERATION;
          });
          this.assignmentService.updateAssignmentSettings(updateSettings, this.workspaceName, this.assignmentName)
            .subscribe({
              next: () => {
                this.assignmentService.exportAssignment(shareRequest).subscribe({
                  next: (filePath) => {
                    this.alertService.success(`Successfully exported ${filePath}.`);
                    this.refresh();
                    this.busyService.stop();
                  },
                  error: (error) => {
                    this.alertService.error(error);
                    this.busyService.stop();
                  }
                });
              },
              error: (error) => {
                this.busyService.stop();
                this.alertService.error(error);
              }
            });
        });
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

  private checkUserSet(): boolean {
    if (isNil(this.settings.user.email) || isNil(this.settings.user.name) ||
      this.settings.user.email === '' || this.settings.user.name === '') {
      const config = new MatDialogConfig<ConfirmationDialogData>();
      config.data = {
        title: 'Configure user',
        yesText: 'Ok',
        message: 'Please first configure your user details at application settings',
        showNo: false
      };
      this.dialog.open(ConfirmationDialogComponent, config);

      return false;
    }

    return true;
  }

  allocateMarkers(): void {
    if (!this.checkUserSet()) {
      return;
    }

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
    dialogRef.afterClosed().subscribe((result) => {
      if (isNil(result)) {
        return;
      }

      const allocations: SubmissionAllocation[] = result.allocations;
      const exportPath: string = result.exportPath;
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
        const submission = find(settings.submissions, {studentId: allocation.studentId});
        submission.allocation = allocation.marker;
        if (submission.state !== SubmissionState.MARKED) {
          submission.state = SubmissionState.ASSIGNED_TO_MARKER;
        }
      });
      this.busyService.start();
      this.assignmentService.updateAssignmentSettings(settings, this.workspaceName, this.assignmentName)
        .subscribe({
          next: () => {
            this.assignmentService.generateAllocationZipFiles(this.workspaceName, this.assignmentName, exportPath).subscribe({
              next: () => {
                this.refresh();
                this.alertService.success(`Markers have been allocated.`);
                this.busyService.stop();
              },
              error: (error) => {
                this.refresh();
                this.alertService.error(error);
                this.busyService.stop();
              }
            });
          },
          error: (error) => {
            this.alertService.error(error);
            this.busyService.stop();
          }
        });
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

    const assignmentSettings = cloneDeep(this.assignmentSettings);
    assignmentSettings.state = AssignmentState.SENT_FOR_REVIEW;
    assignmentSettings.stateDate = new Date().toISOString();

    // Set status of all assignments that has not been marked
    forEach(assignmentSettings.submissions, (submission) => {
      if (isNil(submission.mark)) {
        submission.state = SubmissionState.NOT_MARKED;
      }
    });

    this.assignmentService.updateAssignmentSettings(assignmentSettings, this.workspaceName, this.assignmentName)
      .pipe(
        mergeMap(() => this.appService.saveFile({
            filename: this.assignmentName + '_marked.zip',
            filters: [{
              name: 'Zip File',
              extensions: ['zip']
            }]
          })
        )
      ).subscribe((selectedPathInfo) => {
      if (isNil(selectedPathInfo.selectedPath)) {
        this.busyService.stop();
        return;
      }
      this.assignmentService.exportAssignment({
        assignmentName: this.assignmentName,
        workspaceFolder: this.workspaceName,
        format: ExportFormat.PDFM,
        studentIds: null, // Export all
        zipFilePath: selectedPathInfo.selectedPath
      }).subscribe({
        next: (filepath) => {
          this.alertService.success(`Successfully exported ${filepath}.`);
          this.refresh();
          this.busyService.stop();
        },
        error: () => {
          this.busyService.stop();
        }
      });
    });
  }

  onExportForReview($event: MouseEvent) {
    const allMarked = this.checkAllSubmissionsMarked();
    const config = new MatDialogConfig();
    config.width = '600px';
    config.maxWidth = '600px';
    let message = 'You are about to export the assignment for review, the assignment will be locked for marking after export. ';
    if (this.assignmentSettings.state === AssignmentState.SENT_FOR_REVIEW) {
      message = 'This assignment has already been exported for review, do you want to export it again?';
    } else if (allMarked) {
      message += 'Do you want to continue?';
    } else {
      message += 'There are un-marked submissions, do you want to continue?';
    }
    config.data = {
      title: 'Export for review',
      message
    };
    this.dialog.open(ConfirmationDialogComponent, config).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.exportForReview();
      }
    });
  }


  importMarkerFile(): void {
    const config = new MatDialogConfig();
    config.width = '600px';
    config.maxWidth = '600px';
    config.data = {
      assignmentName: this.assignmentName,
      workspaceName: this.workspaceName,
      assignmentSettings: this.assignmentSettings,
      settings: this.settings
    };
    this.busyService.start();
    this.dialog.open(ImportMarkerModalComponent, config).afterClosed().subscribe((result: LectureImportInfo) => {
      if (result) {
        this.importService.lectureImport(result).subscribe({
          next: () => {
            this.workspaceService.refreshWorkspaces().subscribe(() => {

              this.alertService.success(`Marker file imported.`);
              this.busyService.stop();
              this.refresh();
            });
          },
          error: (error) => {
            this.busyService.stop();
            this.alertService.error(error);
          }
        });
      } else {
        this.busyService.stop();
      }
    });
  }

  reallocateMarkers() {
    this.busyService.start();
    const selectedSubmissions = this.selection.selected.map((value) => {
      return find(this.assignmentSettings.submissions, {studentId: value.studentNumber});
    });

    const markerIds = uniq(map(selectedSubmissions, 'allocation.id'));
    if (markerIds.length > 1) {
      const confirmationModalConfig = new MatDialogConfig<ConfirmationDialogData>();
      confirmationModalConfig.width = '600px';
      confirmationModalConfig.maxWidth = '800px';
      confirmationModalConfig.disableClose = true;
      confirmationModalConfig.data = {
        yesText: 'Ok',
        title: 'Different Markers',
        message: 'Please select submissions for re-allocation that are assigned to the same marker',
        showNo: false
      };
      this.appService.createDialog(ConfirmationDialogComponent, confirmationModalConfig).afterClosed().subscribe({
        next: () => this.busyService.stop()
      });

      return;
    }

    const allMatch = every(this.selection.selected, (s) => s.canReAllocate);
    if (!allMatch) {
      const confirmationModalConfig = new MatDialogConfig<ConfirmationDialogData>();
      confirmationModalConfig.width = '600px';
      confirmationModalConfig.maxWidth = '800px';
      confirmationModalConfig.disableClose = true;
      confirmationModalConfig.data = {
        yesText: 'Ok',
        title: 'Invalid selection',
        message: 'Some of the selected submissions cannot be re-allocated',
        showNo: false
      };
      this.appService.createDialog(ConfirmationDialogComponent, confirmationModalConfig).afterClosed().subscribe({
        next: () => this.busyService.stop()
      });

      return;
    }

    const config = new MatDialogConfig();
    config.width = '600px';
    config.maxWidth = '800px';
    config.disableClose = true;
    config.data = {
      assignmentName: this.assignmentName,
      workspaceName: this.workspaceName,
      assignmentSettings: this.assignmentSettings,
      workspaceAssignment: this.workspaceAssignment,
      submissions: selectedSubmissions
    };

    const dialogRef = this.appService.createDialog(ReallocateSubmissionsModalComponent, config);
    dialogRef.afterClosed().subscribe((marker: Marker) => {
      if (isNil(marker)) {
        this.busyService.stop();
        // If no marker was selected, nothing further to do
        return;
      }

      const updateAssignmentSettings = cloneDeep(this.assignmentSettings);

      selectedSubmissions.forEach((selectedSubmission) => {
        const submission = find(updateAssignmentSettings.submissions, {studentId: selectedSubmission.studentId});
        submission.allocation = {
          id: marker.id,
          email: marker.email
        };
        submission.state = SubmissionState.ASSIGNED_TO_MARKER;
      });

      this.assignmentService.updateAssignmentSettings(updateAssignmentSettings, this.workspaceName, this.assignmentName)
        .pipe(
          mergeMap(() => {
              if (marker.id !== this.settings.user.id) {
                return this.appService.saveFile({
                  filename: this.assignmentName + '_' + marker.email + '_reallocation.zip',
                  filters: [{
                    name: 'Zip File',
                    extensions: ['zip']
                  }]
                });
              }
              return of({selectedPath: null});
            }
          ),
        ).subscribe( {
        next: (selectedPathInfo) => {
          this.refresh();
          if (isNil(selectedPathInfo.selectedPath)) {
            this.busyService.stop();
            return;
          }

          if (marker.id === this.settings.user.id) {
            // If re-allocated to user there is no zips to create
            this.busyService.stop();
            return;
          }

          const shareRequest: ExportAssignmentsRequest = {
            format: ExportFormat.REALLOCATION,
            assignmentName: this.assignmentName,
            workspaceFolder: this.workspaceName,
            studentIds : map(selectedSubmissions, 'studentId'),
            zipFilePath: selectedPathInfo.selectedPath
          };

          this.assignmentService.exportAssignment(shareRequest).subscribe({
            next: (outputPath) => {

              this.alertService.success(`Successfully exported ${outputPath}.`);
              this.busyService.stop();
            },
            error: (error) => {
              this.alertService.error(error);
              this.busyService.stop();
            }
          });

        }, error: (error) => {
          this.alertService.error(error);
        }
      });

    });
  }

  verifyModeration() {
    const confirmationModalConfig = new MatDialogConfig<ConfirmationDialogData>();
    confirmationModalConfig.width = '600px';
    confirmationModalConfig.maxWidth = '800px';
    confirmationModalConfig.disableClose = true;
    confirmationModalConfig.data = {
      title: 'Verify Moderation',
      message: 'Are you sure you want to complete moderation for this assignment?',
    };
    this.appService.createDialog(ConfirmationDialogComponent, confirmationModalConfig).afterClosed().subscribe({
      next: (accepted) => {
        if (!accepted) {
          this.busyService.stop();
        }

        const updatedSettings = cloneDeep(this.assignmentSettings);
        forEach(updatedSettings.submissions, (submission) => {
          if (submission.state === SubmissionState.SENT_FOR_MODERATION) {
            submission.state = SubmissionState.MODERATED;
          }
        });

        this.assignmentService.updateAssignmentSettings(updatedSettings, this.workspaceName, this.assignmentName).subscribe({
          next: () => {
            this.alertService.success(`Assignment marked as moderated`);
            this.busyService.stop();
            this.refresh();
          },
          error: (error) => {
            this.busyService.stop();
            this.alertService.error(error);
          }
        });

      },
      error: () => {
        this.busyService.stop();
      }
    });
  }
}
