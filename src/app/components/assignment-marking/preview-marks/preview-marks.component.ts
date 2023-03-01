import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {IconTypeEnum} from '@shared/info-objects/icon-type.enum';
import {forEach, isNil} from 'lodash';
import {DEFAULT_MARKS} from '@shared/constants/constants';
import {AssignmentSettingsInfo, Submission} from '@shared/info-objects/assignment-settings.info';
import {MarkInfo} from '@shared/info-objects/mark.info';

@Component({
  selector: 'pdf-marker-preview-marks',
  templateUrl: './preview-marks.component.html',
  styleUrls: ['./preview-marks.component.scss']
})
export class PreviewMarksComponent implements OnInit {

  studentDetails: string;

  generalMarks = 0;

  numberCommentMarks = 0;

  totalMark = 0;

  totalCommentorNumberMarks: any[] = [];

  private sectionLabel = '';

  constructor(private dialogRef: MatDialogRef<PreviewMarksComponent>,
              @Inject(MAT_DIALOG_DATA) config) {
    if (config.studentSubmission) {
      const submission = config.studentSubmission as Submission;
      this.studentDetails = submission.studentSurname + ', ' + submission.studentName + ' (' + submission.studentId + ')';
      const assignmentSettings = config.assignmentSettings as AssignmentSettingsInfo;

      if (isNil(assignmentSettings.rubric)) {
        forEach(config.submissionInfo.marks as MarkInfo[][], (pageMarks) => {
          forEach(pageMarks, (mark) => {
            switch (mark.iconType) {
              case IconTypeEnum.FULL_MARK:
                this.generalMarks += DEFAULT_MARKS.FULL;
                break;
              case IconTypeEnum.HALF_MARK:
                this.generalMarks += (DEFAULT_MARKS.FULL / 2);
                break;
              case IconTypeEnum.CROSS:
                this.generalMarks += DEFAULT_MARKS.INCORRECT;
                break;
              case IconTypeEnum.NUMBER:
                if (!isNil(mark.totalMark)) {
                  this.totalCommentorNumberMarks.push(mark);
                  this.numberCommentMarks += mark.totalMark;
                  this.sectionLabel = config.sectionLabel;
                }
                break;
              default:
                break;
            }
          });
        });
      } else {
        forEach(config.submissionInfo.marks as number[], (rubricIndex, index) => {
          if (!isNil(rubricIndex)) {
            this.generalMarks +=  assignmentSettings.rubric.criterias[index].levels[rubricIndex].score;
          }
        });
      }
      this.totalMark = this.generalMarks + this.numberCommentMarks;
    }
  }

  ngOnInit() {
  }

  onClose() {
    this.dialogRef.close((this.totalMark >= 0) ? this.totalMark : 0);
  }

}
