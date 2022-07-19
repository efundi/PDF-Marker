import { Component, OnInit } from '@angular/core';
import {filter, find, isNil, sortBy} from 'lodash';
import {StudentSubmission, TreeNodeType} from '@shared/info-objects/workspace';
import {FEEDBACK_FOLDER, MARK_FILE, SUBMISSION_FOLDER} from '@shared/constants/constants';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {RoutesEnum} from '../../utils/routes.enum';
import {AssignmentDetails} from '../assignment-overview/assignment-overview.component';
import {AssignmentService} from '../../services/assignment.service';
import {Router} from '@angular/router';

export interface SubmissionItem {
  studentFullName: string;
  studentNumber: string;
}

@Component({
  selector: 'pdf-marker-submission-navigator',
  templateUrl: './submission-navigator.component.html',
  styleUrls: ['./submission-navigator.component.scss']
})
export class SubmissionNavigatorComponent implements OnInit {

  canNext = false;
  canPrevious = false;

  activeIndex = 0;
  menuItems: SubmissionItem[] = [];

  constructor(private assignmentService: AssignmentService,
              private router: Router) { }

  ngOnInit(): void {
    this.generateDataFromModel();
  }


  private generateDataFromModel() {
    this.assignmentService.getAssignmentHierarchy(null, "new").subscribe((workspaceAssignment) => {

      if (!isNil(workspaceAssignment)) {
        this.menuItems = filter(workspaceAssignment.children, {type: TreeNodeType.SUBMISSION}).map((workspaceSubmission: StudentSubmission) => {
          return {
            studentFullName: workspaceSubmission.studentSurname + (isNil(workspaceSubmission.studentName) ? '' : ', ' + workspaceSubmission.studentName),
            studentNumber: workspaceSubmission.studentId,
          };
        });
        this.activeIndex = 0;
        this.updateStates();
      }
    });
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
  }

  openAssignment(){
    this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, "new"]);
  }

  private updateStates(): void {
    this.canNext = this.activeIndex < this.menuItems.length - 1;
    this.canPrevious = this.activeIndex > 0;
  }

}
