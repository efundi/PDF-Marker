import {Component, Input, OnInit} from '@angular/core';
import {IRubric, IRubricCriteria} from '@shared/info-objects/rubric.class';

@Component({
  selector: 'pdf-marker-rubric-view-marking',
  templateUrl: './rubric-view-marking.component.html',
  styleUrls: ['./rubric-view-marking.component.scss']
})
export class RubricViewMarkingComponent implements OnInit {

  rubricBlocks:  IRubricCriteria[];
  rubricName: string;

  @Input()
  rubricMarking: IRubric;

  @Input()
  rubricSelections: any[] = [];

  constructor() {
  }

  buildRubricForMarking(rubric: IRubric) {
    console.log('InBuild for Marking' + this.rubricMarking);
    this.rubricName = rubric.name;
    this.rubricBlocks = rubric.criterias;
  }

  ngOnInit(): void {
    this.buildRubricForMarking(this.rubricMarking);
  }

  onMarksUpdated(marksUpdated: any[] = []) {
    this.rubricSelections = marksUpdated;
  }
}
