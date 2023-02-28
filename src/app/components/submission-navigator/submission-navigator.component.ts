import {Component, OnDestroy, OnInit} from '@angular/core';
import {filter, find, findIndex, forEach, isNil} from 'lodash';
import {StudentSubmissionTreeNode, TreeNodeType, WorkspaceFileTreeNode} from '@shared/info-objects/workspaceTreeNode';
import {RoutesEnum} from '../../utils/routes.enum';
import {AssignmentService} from '../../services/assignment.service';
import {Router} from '@angular/router';
import {mergeMap, Observable, Subscription, tap} from 'rxjs';
import {SelectedSubmission} from '../../info-objects/selected-submission';
import {SettingsService} from '../../services/settings.service';
import {SubmissionNavigationService} from '../../services/submission-navigation.service';
import {AssignmentSettingsInfo, DistributionFormat, Submission} from '@shared/info-objects/assignment-settings.info';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {SubmissionInfo, SubmissionType} from '@shared/info-objects/submission.info';
import {MarkInfo} from '@shared/info-objects/mark.info';

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
  activeSubmission: SelectedSubmission;

  /**
   * Items to display in the droplist
   */
  menuItems: SubmissionItem[] = [];

  private assignmentSettings: AssignmentSettingsInfo;

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
              private router: Router,
              private submissionNavigationService: SubmissionNavigationService) { }

  ngOnInit(): void {
    this.submissionChangeSubscription = this.assignmentService.submissionUpdated.subscribe((submissionUpdateEvent) => {
      if (submissionUpdateEvent.workspaceName === this.activeSubmission.workspace.name &&
        submissionUpdateEvent.assignmentName === this.activeSubmission.assignment.name &&
        submissionUpdateEvent.studentId === this.menuItems[this.activeIndex].studentId) {
         this.recalculateMark(submissionUpdateEvent.submission);
      }
      console.log(submissionUpdateEvent);
    });

    this.settingsService.getConfigurations().subscribe((settings) => {
      this.settings = settings;

      this.assignmentSubscription = this.assignmentService.selectedSubmissionChanged.subscribe((submission) => {
        this.activeSubmission = submission;
        this.generateDataFromModel(submission);
        this.loadMarkingDetails();
      });
    });


  }

  private recalculateMark(submissionInfo: SubmissionInfo) {
    if (isNil(this.assignmentSettings.rubric)) {
      let sum = 0;
      forEach(submissionInfo.marks as MarkInfo[][], (pageMarks) => {
        forEach(pageMarks, (mark) => {
          sum += mark.totalMark;
        });
      });
      this.marks = sum;
    } else {
      let sum = 0;
      forEach(submissionInfo.marks as number[], (rubricIndex, index) => {
        if (!isNil(rubricIndex)) {
         sum +=  this.assignmentSettings.rubric.criterias[index].levels[rubricIndex].score;
        }
      });
      this.marks = sum;
    }
  }

  private getMarks(): Observable<SubmissionInfo> {
    return this.assignmentService.getSavedMarks(
      this.activeSubmission.workspace.name,
      this.activeSubmission.assignment.name,
      this.menuItems[this.activeIndex].studentId)
      .pipe(
        tap((submissionInfo) => this.recalculateMark(submissionInfo))
      );
  }

  private loadMarkingDetails() {
    if (isNil(this.activeSubmission)) {
      this.marker = null;
    } else {
      this.loadAssignmentSettings(this.activeSubmission)
        .pipe(
          mergeMap(() => this.getMarks())
        )
        .subscribe(() => {
          this.loadMarker();
        });
    }
  }

  private loadMarker() {

    if (this.assignmentSettings.distributionFormat === DistributionFormat.STANDALONE) {
      this.marker = 'Me';
    } else {
      const myEmail = this.settings.user.email;
      const assignmentSubmission: Submission = find(this.assignmentSettings.submissions, {studentId: this.menuItems[this.activeIndex].studentId});
      if (isNil(assignmentSubmission.allocation) || assignmentSubmission.allocation.email === myEmail) {
        this.marker = 'Me';
      } else {
        const marker = find(this.settings.markers, {email: assignmentSubmission.allocation.email});
        this.marker = marker.name;
      }
    }
  }

  private loadAssignmentSettings(selectedSubmission: SelectedSubmission): Observable <AssignmentSettingsInfo> {
    return this.assignmentService.getAssignmentSettings(selectedSubmission.workspace.name, selectedSubmission.assignment.name)
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

  private generateDataFromModel(activeSubmission: SelectedSubmission) {
    if (isNil(activeSubmission)) {
      this.menuItems = [];
    } else {
      this.menuItems = filter(activeSubmission.assignment.children, {type: TreeNodeType.SUBMISSION})
        .map((studentSubmission: StudentSubmissionTreeNode) => {

          // Find submission or feedback pdf
          let submissionFile: WorkspaceFileTreeNode = studentSubmission.children
            .find((tn) => tn.type === TreeNodeType.SUBMISSIONS_DIRECTORY).children[0] as WorkspaceFileTreeNode;
          if (isNil(submissionFile)) {
            submissionFile = studentSubmission.children.find((tn) => tn.type === TreeNodeType.FEEDBACK_DIRECTORY).children[0] as WorkspaceFileTreeNode;
          }

          if (isNil(submissionFile)) {
            return null; // This student does not have submissions or feedback...
          }

          return {
            studentFullName: studentSubmission.studentSurname + (isNil(studentSubmission.studentName) ? '' : ', ' + studentSubmission.studentName),
            studentId: studentSubmission.studentId,
            pdfFile: submissionFile
          };
        })
        .filter((mi) => !isNil(mi))
        .sort((a, b) => a.studentFullName.localeCompare(b.studentFullName));
      this.activeIndex = findIndex(this.menuItems, (item) => {
        return item.pdfFile === activeSubmission.pdfFile;
      });
      this.updateStates();
    }
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
    this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, this.activeSubmission.assignment.name, this.activeSubmission.workspace.name]);
  }

  private updateStates(): void {
    this.canNext = this.activeIndex < this.menuItems.length - 1;
    this.canPrevious = this.activeIndex > 0;
  }

}
