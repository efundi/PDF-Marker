import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {IRubric, IRubricCriteria} from "@coreModule/utils/rubric.class";

@Component({
  selector: 'pdf-marker-rubric',
  templateUrl: './rubric.component.html',
  styleUrls: ['./rubric.component.scss']
})
export class RubricComponent implements OnInit, OnChanges {

  @Input()
  rubric: IRubric;

  private rubricSelections = [];

  constructor() { }

  ngOnInit() {
  }

  selectedCriteria(criteriaLevelIndex: number, criteriaIndex) {
    console.log(`Criteria Index ${criteriaIndex} and criteria level index ${criteriaLevelIndex}`);
    this.rubricSelections[criteriaIndex] = criteriaLevelIndex;
    console.log(this.rubricSelections);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.rubricSelections = [];
    changes.rubric.currentValue.criterias.forEach((criteria: IRubricCriteria, index) => {
      this.rubricSelections[index] = null;
    })
  }



}
