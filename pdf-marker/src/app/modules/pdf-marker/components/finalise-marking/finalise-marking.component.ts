import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {IconTypeEnum} from "@pdfMarkerModule/info-objects/icon-type.enum";

@Component({
  selector: 'pdf-marker-finalise-marking',
  templateUrl: './finalise-marking.component.html',
  styleUrls: ['./finalise-marking.component.scss']
})
export class FinaliseMarkingComponent implements OnInit {

  private readonly regEx = /(.*)\((.+)\)/;

  studentDetails: string;

  generalMarks: number = 0;

  numberCommentMarks: number = 0;

  totalMark: number = 0;

  totalCommentorNumberMarks: any[] = [];

  private sectionLabel: string = '';

  constructor(private dialogRef: MatDialogRef<FinaliseMarkingComponent>,
              @Inject(MAT_DIALOG_DATA) config) {
    if(config.assignmentPath) {
      const assignmentPathSplit = config.assignmentPath.split("/");
      if (assignmentPathSplit.length == 4) {
        const studentDetails = assignmentPathSplit[1];
        if (this.regEx.test(studentDetails)) {
          this.studentDetails = studentDetails;
        }
      }

      console.log(config);

      const pagesArray = Object.keys(config.marks);
      pagesArray.forEach(page => {
        if(Array.isArray(config.marks[page])) {
          config.marks[page].forEach(mark => {
            switch (mark.iconType) {
              case IconTypeEnum.FULL_MARK:
                this.generalMarks += config.defaultTick;
                break;
              case IconTypeEnum.HALF_MARK:
                this.generalMarks += (config.defaultTick / 2);
                break;
              case IconTypeEnum.CROSS:
                this.generalMarks += config.incorrectTick;
                break;
              case IconTypeEnum.NUMBER:
                this.totalCommentorNumberMarks.push(mark);
                this.numberCommentMarks += mark.totalMark;
                this.sectionLabel = config.sectionLabel;
                break;
              default:
                break;
            }
          });
        }
      });



      this.totalMark = this.generalMarks + this.numberCommentMarks;
    }
  }

  ngOnInit() {
  }

  onClose() {
    this.dialogRef.close((this.totalMark >= 0) ? this.totalMark:0);
  }

}
