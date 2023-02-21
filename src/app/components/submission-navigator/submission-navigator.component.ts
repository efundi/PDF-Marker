import {Component, OnDestroy, OnInit} from '@angular/core';
import {filter, findIndex, isNil} from 'lodash';
import {StudentSubmission, TreeNodeType, WorkspaceFile} from '@shared/info-objects/workspace';
import {RoutesEnum} from '../../utils/routes.enum';
import {AssignmentService} from '../../services/assignment.service';
import {Router} from '@angular/router';
import {Subscription, tap} from 'rxjs';
import {SelectedSubmission} from '../../info-objects/selected-submission';
import {SettingsService} from '../../services/settings.service';
import {SubmissionNavigationService} from '../../services/submission-navigation.service';

export interface SubmissionItem {
  studentFullName: string;
  studentId: string;
  pdfFile: WorkspaceFile;
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

  /**
   * Subscription listening for the active submission
   * @private
   */
  private assignmentSubscription: Subscription;


  constructor(private assignmentService: AssignmentService,
              private settingsService: SettingsService,
              private router: Router,
              private submissionNavigationService: SubmissionNavigationService) { }

  ngOnInit(): void {

    this.assignmentSubscription = this.assignmentService.selectedSubmissionChanged.subscribe((submission) => {
      this.activeSubmission = submission;
      this.generateDataFromModel(submission);
    });
  }

  ngOnDestroy() {
    this.assignmentSubscription.unsubscribe();
  }

  private generateDataFromModel(activeSubmission: SelectedSubmission) {
    if (isNil(activeSubmission)) {
      this.menuItems = [];
    } else {
      this.menuItems = filter(activeSubmission.assignment.children, {type: TreeNodeType.SUBMISSION})
        .map((studentSubmission: StudentSubmission) => {

          // Find submission or feedback pdf
          let submissionFile: WorkspaceFile = studentSubmission.children
            .find((tn) => tn.type === TreeNodeType.SUBMISSIONS_DIRECTORY).children[0] as WorkspaceFile;
          if (isNil(submissionFile)) {
            submissionFile = studentSubmission.children.find((tn) => tn.type === TreeNodeType.FEEDBACK_DIRECTORY).children[0] as WorkspaceFile;
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
