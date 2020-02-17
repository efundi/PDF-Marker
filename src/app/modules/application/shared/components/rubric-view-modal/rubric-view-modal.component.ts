import {Component, Inject, Input, OnInit} from '@angular/core';
import {AppService} from "@coreModule/services/app.service";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {IRubric, IRubricCriteria} from "@coreModule/utils/rubric.class";


@Component({
  selector: 'pdf-marker-rubric-view-modal',
  templateUrl: './rubric-view-modal.component.html',
  styleUrls: ['./rubric-view-modal.component.scss'],
})
export class RubricViewModalComponent implements OnInit {

  rubricBlocks:  IRubricCriteria[];
  rubricName: string;
  @Input() rubricMarking: IRubric;
  totalScore: number = 0;


  constructor(private appService: AppService, private dialogRef: MatDialogRef<RubricViewModalComponent>,
              @Inject(MAT_DIALOG_DATA) config) {
    if (config != null) {
      this.rubricMarking = config.rubric;
      this.buildRubricForModal();
    }
  }

  buildRubricForModal() {
    this.rubricBlocks = (this.rubricMarking && this.rubricMarking.criterias) ? this.rubricMarking.criterias:[];

   this.rubricBlocks.forEach((value, index) => {
     value.levels.forEach((value1, index1, array) => {
       this.totalScore = this.totalScore + parseFloat(value1.score.toString());
     })
   })

  }

  ngOnInit() {}

  onClose() {
    this.dialogRef.close();
  }
}
