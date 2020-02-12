import {Component, Inject, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {IRubric, IRubricCriteria} from "@coreModule/utils/rubric.class";
import {AppService} from "@coreModule/services/app.service";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'pdf-marker-rubric-view-marking',
  templateUrl: './rubric-view-marking.component.html',
  styleUrls: ['./rubric-view-marking.component.scss']
})
export class RubricViewMarkingComponent implements OnInit, OnChanges {

  rubricBlocks:  IRubricCriteria[];
  rubricName: string;
  @Input() rubricMarking: IRubric;

  constructor(private appService: AppService) {
  }
  buildRubricForMarking(rubric: IRubric) {
    console.log("InBuild for Marking" + this.rubricMarking);
    this.rubricName = rubric.name;
    this.rubricBlocks = rubric.criterias;
  }

  ngOnInit(): void {
    this.buildRubricForMarking(this.rubricMarking);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
  }
}
