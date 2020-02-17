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
  maxScore: number = 0;

  private rubricSelections = [];

  constructor() { }

  ngOnInit() {
    this.getHighestScore(this.rubric);
  }

  getHighestScore(rubric: IRubric) {
    this.rubric.criterias.forEach((value, index) => {
      value.levels.forEach((value1, index1, array) => {
        this.maxScore = this.maxScore + parseFloat(value1.score.toString());
      })
    })
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
