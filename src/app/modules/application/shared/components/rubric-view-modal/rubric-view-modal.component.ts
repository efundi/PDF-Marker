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

  constructor(private appService: AppService, private dialogRef: MatDialogRef<RubricViewModalComponent>,
              @Inject(MAT_DIALOG_DATA) config) {
    if (config != null) {
      this.buildRubricForModal(config.name, config.criterias);
    }
  }
  buildRubricForModal(rubricName: string, rubricCriterias: IRubricCriteria[])
  {
    console.log("InBuild for Modal");
    this.rubricName = rubricName;
    this.rubricBlocks = rubricCriterias;
  }

  ngOnInit() {}

}
