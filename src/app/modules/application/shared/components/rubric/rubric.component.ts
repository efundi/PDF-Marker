import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {IRubric, IRubricCriteria} from "@coreModule/utils/rubric.class";
import {Router} from "@angular/router";
import {RoutesEnum} from "@coreModule/utils/routes.enum";

@Component({
  selector: 'pdf-marker-rubric',
  templateUrl: './rubric.component.html',
  styleUrls: ['./rubric.component.scss']
})
export class RubricComponent implements OnInit, OnChanges {

  @Input()
  rubric: IRubric;
  maxScore: number = 0;

  totalTally: number = 0;

  private rubricSelections = [];

  isMarkingRubricPage: boolean;



  constructor(private router: Router) {
    this.isMarkingRubricPage = this.router.url === RoutesEnum.ASSIGNMENT_MARKER_RUBRIC;
    console.log("Am I in assignment rubric page? " + this.isMarkingRubricPage);
  }

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
    if(this.isMarkingRubricPage) {
      if (this.rubricSelections[criteriaIndex] === criteriaLevelIndex)
        this.rubricSelections[criteriaIndex] = null;
      else
        this.rubricSelections[criteriaIndex] = criteriaLevelIndex;
      this.totalTally = 0;
      this.rubricSelections.forEach((criteriaLevelIndexValue, index) => {
        if (criteriaLevelIndexValue !== null) {
          this.totalTally += parseFloat("" + this.rubric.criterias[index].levels[criteriaLevelIndexValue].score);
        }
      });

      console.log(this.rubricSelections);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.rubricSelections = [];
    changes.rubric.currentValue.criterias.forEach((criteria: IRubricCriteria, index) => {
      this.rubricSelections[index] = null;
    })
  }



}
