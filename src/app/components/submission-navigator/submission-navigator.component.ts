import {Component, OnDestroy, OnInit} from '@angular/core';
import {filter, find, findIndex, forEach, isNil} from 'lodash';
import {StudentSubmissionTreeNode, TreeNodeType, WorkspaceFileTreeNode} from '@shared/info-objects/workspaceTreeNode';
import {RoutesEnum} from '../../utils/routes.enum';
import {AssignmentService} from '../../services/assignment.service';
import {Router} from '@angular/router';
import {mergeMap, Observable, of, Subscription, tap} from 'rxjs';
import {SelectedSubmission} from '../../info-objects/selected-submission';
import {SettingsService} from '../../services/settings.service';
import {SubmissionNavigationService} from '../../services/submission-navigation.service';
import {
    AssignmentSettingsInfo,
    DistributionFormat, SourceFormat,
    Submission,
    SubmissionState
} from '@shared/info-objects/assignment-settings.info';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {SubmissionInfo} from '@shared/info-objects/submission.info';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {MatDialogConfig} from '@angular/material/dialog';
import {PreviewMarksComponent} from '../assignment-marking/preview-marks/preview-marks.component';
import {AppService} from '../../services/app.service';

export interface SubmissionItem {
  studentFullName: string;
  studentId: string;
  pdfFile: WorkspaceFileTreeNode;
}

@Component({
  selector: 'pdf-marker-submission-navigator',
  templateUrl: './submission-navigator.component.html',
  styleUrls: ['./submission-navigator.component.scss']
})
export class SubmissionNavigatorComponent implements OnInit, OnDestroy {

  /**
   * Indicator if we are busy waiting for a page to load.
   * This is used to prevent the user from quickly jumping pages while waiting for files to convert
   */
  busy = false;

  /**
   * Indicator if we can navigate any further
   */
  canNext = false;

  /**
   * Indicator if we can navigate any back
   */
  canPrevious = false;

  /**
   * Index of currently active submission
   */
  activeIndex = 0;

  /**
   * Active selected submission
   */
  selectedSubmission: SelectedSubmission;
  private activeSubmissionInfo: SubmissionInfo;
  private assignmentSubmission: Submission;

  private workspaceName: string;
  private assignmentName: string;
  /**
   * Items to display in the droplist
   */
  menuItems: SubmissionItem[] = [];

  assignmentSettings: AssignmentSettingsInfo;

  /**
   * Subscription listening for the active submission
   * @private
   */
  private assignmentSubscription: Subscription;
  private submissionChangeSubscription: Subscription;

  marker = '';
  marks = 0;

  private settings: SettingInfo;



  constructor(private assignmentService: AssignmentService,
              private settingsService: SettingsService,
              private appService: AppService,
              private router: Router,
              private submissionNavigationService: SubmissionNavigationService) { }

  ngOnInit(): void {
    this.submissionChangeSubscription = this.assignmentService.submissionUpdated.subscribe((submissionUpdateEvent) => {
      if (isNil(this.selectedSubmission)) {
        return; // This only happens in dev mode when the page reloads
      }
      if (submissionUpdateEvent.workspaceName === this.workspaceName &&
        submissionUpdateEvent.assignmentName === this.assignmentName &&
        submissionUpdateEvent.studentId === this.assignmentSubmission.studentId) {
        this.activeSubmissionInfo = submissionUpdateEvent.submission;
        this.recalculateMark();
      }
    });

    this.settingsService.getConfigurations().subscribe((settings) => {
      this.settings = settings;

      this.assignmentSubscription = this.assignmentService.selectedSubmissionChanged.pipe(
        mergeMap(selectedSubmission => {
          this.selectedSubmission = selectedSubmission;
          if (isNil(selectedSubmission)) {
            this.workspaceName = null;
            this.assignmentName = null;
            this.menuItems = [];
            this.marker = null;
            return of(null);
          } else {
            this.workspaceName = selectedSubmission.workspace.name;
            this.assignmentName = selectedSubmission.assignment.name;
            return this.loadAssignmentSettings().pipe(
              tap(() => {
                const studentDirectory = selectedSubmission.pdfFile.parent.parent.name;
                this.assignmentSubmission = find(this.assignmentSettings.submissions, {directoryName: studentDirectory});
              }),
              tap(() => this.generateDataFromModel()),
              mergeMap(() => this.getMarks()),
              tap(() => this.recalculateMark()),
              tap(() => this.loadMarker())
            );
          }
        })
      ).subscribe(() => {

      });
    });


  }

  private recalculateMark() {
    if (isNil(this.assignmentSettings.rubric)) {
      let sum = 0;
      forEach(this.activeSubmissionInfo.marks as MarkInfo[][], (pageMarks) => {
        forEach(pageMarks, (mark) => {
          if(!isNil(mark.totalMark)) {
            sum += mark.totalMark;
          }
        });
      });
      this.marks = sum;
    } else {
      let sum = 0;
      forEach(this.activeSubmissionInfo.marks as number[], (rubricIndex, index) => {
        if (!isNil(rubricIndex)) {
          sum +=  this.assignmentSettings.rubric.criterias[index].levels[rubricIndex].score;
        }
      });
      this.marks = sum;
    }
  }

  private getMarks(): Observable<SubmissionInfo> {
    return this.assignmentService.getSavedMarks(
      this.workspaceName,
      this.assignmentName,
      this.assignmentSubmission.studentId
    )
      .pipe(
        tap((submissionInfo) => this.activeSubmissionInfo = submissionInfo)
      );
  }

  private loadMarker() {

    if (this.assignmentSettings.distributionFormat === DistributionFormat.STANDALONE) {
      this.marker = 'Me';
    } else {
      const myEmail = this.settings.user.email;

      if (isNil(this.assignmentSubmission.allocation) || this.assignmentSubmission.allocation.email === myEmail) {
        this.marker = 'Me';
      } else {
        const marker = find(this.settings.markers, {email: this.assignmentSubmission.allocation.email});
        if (isNil(marker)){
          console.error("Assignment's marker \"" + this.assignmentSubmission.allocation.email + "\" is not in your settings!")
          // This will only happen when you mess up your application settings
          this.marker = "Unknown"
        } else {
          this.marker = marker.name;
        }
      }
    }
  }

  private loadAssignmentSettings(): Observable <AssignmentSettingsInfo> {
    return this.assignmentService.getAssignmentSettings(this.workspaceName, this.assignmentName)
      .pipe(
        tap((assignmentSettingsInfo) => this.assignmentSettings = assignmentSettingsInfo)
      );
  }

  ngOnDestroy() {
    if (this.assignmentSubscription) {
      this.assignmentSubscription.unsubscribe();
    }

    if (this.submissionChangeSubscription) {
      this.submissionChangeSubscription.unsubscribe();
    }

  }

  private generateDataFromModel() {
    this.menuItems = this.assignmentSettings.submissions.map((submission: Submission) => {

      if (submission.state === SubmissionState.NO_SUBMISSION) {
        return null; // This student does not have submissions or feedback...
      }
      const submissionTreeNode: StudentSubmissionTreeNode = find(this.selectedSubmission.assignment.children, {
        type: TreeNodeType.SUBMISSION,
        name: submission.directoryName
      }) as StudentSubmissionTreeNode;

      // Find submission or feedback pdf
      let submissionFile: WorkspaceFileTreeNode = find(submissionTreeNode.children, {
        type :  TreeNodeType.SUBMISSIONS_DIRECTORY
      }).children[0] as WorkspaceFileTreeNode;

      if (isNil(submissionFile)) {
        submissionFile = find(submissionTreeNode.children, {
          type: TreeNodeType.FEEDBACK_DIRECTORY
        }).children[0] as WorkspaceFileTreeNode;
      }

      if (isNil(submissionFile)) {
        return null;
      }

      let fullName = "";
      if (!isNil(submission.studentSurname)){
        fullName = submission.studentSurname;

        if(!isNil(submission.studentName)){
          fullName += ", "
        }
      }
      if (!isNil(submission.studentName)){
        fullName += submission.studentName;
      }
      return {
        studentFullName: fullName,
        studentId: submission.studentId,
        pdfFile: submissionFile
      };
    })
      .filter((mi) => !isNil(mi))
      .sort((a, b) => a.studentFullName.localeCompare(b.studentFullName));
    this.activeIndex = findIndex(this.menuItems, (item) => {
      return item.pdfFile === this.selectedSubmission.pdfFile;
    });
    this.updateStates();
  }

  next(): void {
    this.selectSubmission(this.activeIndex + 1);
  }

  previous(): void {
    this.selectSubmission(this.activeIndex - 1);
  }

  selectSubmission(index: number) {
    const nextItem = this.menuItems[index];
    this.busy = true;
    this.submissionNavigationService.openSubmission(nextItem.pdfFile).subscribe({
      next: () => {
        this.busy = false;
      },
      error: () => {
        this.busy = false;
      }
    });

  }

  openAssignment() {
    this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, this.selectedSubmission.assignment.name, this.selectedSubmission.workspace.name]);
  }

  private updateStates(): void {
    this.canNext = this.activeIndex < this.menuItems.length - 1;
    this.canPrevious = this.activeIndex > 0;
  }

  previewMarks() {
    const config: MatDialogConfig = new MatDialogConfig();
    config.width = '400px';
    config.height = '500px';
    config.disableClose = true;
    config.data = {
      studentSubmission: this.assignmentSubmission,
      submissionInfo: this.activeSubmissionInfo,
      assignmentSettings: this.assignmentSettings
    };
    this.appService.createDialog(PreviewMarksComponent, config);
  }

    protected readonly SourceFormat = SourceFormat;
}
