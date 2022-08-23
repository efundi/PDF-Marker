import {Component, OnDestroy, OnInit} from '@angular/core';
import {filter, findIndex, isNil} from 'lodash';
import {StudentSubmission, TreeNodeType, WorkspaceFile} from '@shared/info-objects/workspace';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {RoutesEnum} from '../../utils/routes.enum';
import {AssignmentService} from '../../services/assignment.service';
import {Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {SelectedSubmission} from '../../info-objects/selected-submission';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {SettingsService} from '../../services/settings.service';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {calculateOpenInMarking} from '../../utils/utils';

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

  private assignmentSettings: AssignmentSettingsInfo;
  private settings: SettingInfo;

  constructor(private assignmentService: AssignmentService,
              private settingsService: SettingsService,
              private router: Router) { }

  ngOnInit(): void {
    this.loadSettings();

    this.assignmentSubscription = this.assignmentService.selectedSubmissionChanged.subscribe((assignment) => {
      this.activeSubmission = assignment;
      this.loadAssignmentSettings();
      this.generateDataFromModel(assignment);
    });
  }

  ngOnDestroy() {
    this.assignmentSubscription.unsubscribe();
  }

  private loadSettings(){
    this.settingsService.getConfigurations()
      .subscribe({
        next: (settings) => {
          this.settings = settings;
        }
      });
  }

  private loadAssignmentSettings() {
    if (!isNil(this.activeSubmission)) {
       this.assignmentService.getAssignmentSettings(this.activeSubmission.workspace.name, this.activeSubmission.assignment.name).subscribe((settings) => {
        this.assignmentSettings = settings;
      });
    }
  }

  private generateDataFromModel(activeSubmission: SelectedSubmission) {
    if (isNil(activeSubmission)) {
      this.menuItems = [];
    } else {
      this.menuItems = filter(activeSubmission.assignment.children, {type: TreeNodeType.SUBMISSION})
        .map((studentSubmission: StudentSubmission) => {

          // Find submission or feedback pdf
          let pdfNode: WorkspaceFile = studentSubmission.children.find((tn) => tn.type === TreeNodeType.SUBMISSIONS_DIRECTORY).children[0]  as WorkspaceFile;
          if (isNil(pdfNode)) {
            pdfNode = studentSubmission.children.find((tn) => tn.type === TreeNodeType.FEEDBACK_DIRECTORY).children[0] as WorkspaceFile;
          }

          if (isNil(pdfNode)) {
            return null; // This student does not have submissions or feedback...
          }

          return {
            studentFullName: studentSubmission.studentSurname + (isNil(studentSubmission.studentName) ? '' : ', ' + studentSubmission.studentName),
            studentId: studentSubmission.studentId,
            pdfFile: pdfNode
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
    this.activeIndex = index;
    this.updateStates();
    const workspace = this.activeSubmission.workspace;
    const assignment = this.activeSubmission.assignment;
    const activeMenuItem = this.menuItems[this.activeIndex];

    const workspaceName = workspace.name;
    const assignmentName =  assignment.name;
    const pdfPath = PdfmUtilsService.buildTreePath(activeMenuItem.pdfFile);

    this.assignmentService.selectSubmission({
      workspace,
      assignment,
      pdfFile: activeMenuItem.pdfFile
    });

    if (calculateOpenInMarking(this.assignmentSettings)) {
      this.router.navigate([RoutesEnum.ASSIGNMENT_MARKER, workspaceName, assignmentName, pdfPath]);
    } else {
      this.router.navigate([RoutesEnum.PDF_VIEWER, workspaceName, assignmentName, pdfPath]);
    }
  }

  openAssignment() {
    this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, this.activeSubmission.assignment.name, this.activeSubmission.workspace.name]);
  }

  private updateStates(): void {
    this.canNext = this.activeIndex < this.menuItems.length - 1;
    this.canPrevious = this.activeIndex > 0;
  }

}
