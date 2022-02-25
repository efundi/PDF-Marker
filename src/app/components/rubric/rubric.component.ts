import {Component, Input, OnChanges, OnInit, Optional, SimpleChanges} from '@angular/core';
import {Router} from '@angular/router';
import {AssignmentService} from '../../services/assignment.service';
import {AppService} from '../../services/app.service';
import {cloneDeep, isArray} from 'lodash';
import {IRubric} from '@shared/info-objects/rubric.class';
import {AssignmentMarkingComponent} from '../assignment-marking/assignment-marking.component';

@Component({
  selector: 'pdf-marker-rubric',
  templateUrl: './rubric.component.html',
  styleUrls: ['./rubric.component.scss'],
})
export class RubricComponent implements OnInit, OnChanges {

  @Input()
  rubric: IRubric;

  @Input()
  private rubricSelections;

  maxScore = 0;

  totalTally = 0;

  isMarkingRubricPage: boolean;

  constructor(private router: Router,
              private assignmentService: AssignmentService,
              @Optional() private assignmentMarkingComponent: AssignmentMarkingComponent,
              private appService: AppService) {
  }

  ngOnInit() {
    this.getHighestScore(this.rubric);
    this.getTotalMark();
    this.isMarkingRubricPage = isArray(this.rubricSelections);
  }

  getHighestScore(rubric: IRubric) {
    this.rubric.criterias.forEach((value, index) => {
      let curHighest = -1;
      value.levels.forEach((value1, index1, array) => {
        if (value1.score > curHighest) {
          curHighest = value1.score;
        }
      });
      this.maxScore = this.maxScore + parseFloat(curHighest.toString());
    });
  }

  getTotalMark() {
    this.totalTally = 0;
    if (isArray(this.rubricSelections)) {
      this.rubricSelections.forEach((criteriaLevelIndexValue, index) => {
        if (criteriaLevelIndexValue !== null) {
          this.totalTally += parseFloat('' + this.rubric.criterias[index].levels[criteriaLevelIndexValue].score);
        }
      });
    }
  }

  selectedCriteria(criteriaLevelIndex: number, criteriaIndex) {
    if (this.isMarkingRubricPage) {
      const marks = cloneDeep(this.rubricSelections);
      if (marks[criteriaIndex] === criteriaLevelIndex) {
        marks[criteriaIndex] = null;
      } else {
        marks[criteriaIndex] = criteriaLevelIndex;
      }
      this.getTotalMark();
      // call assignmentService
      this.assignmentMarkingComponent.saveRubricMarks(marks).subscribe();
    }
  }

  getSelectionIndex(criteriaIndex: number): number {
    if (isArray(this.rubricSelections)) {
      return (this.rubricSelections[criteriaIndex] === null) ? -1 : this.rubricSelections[criteriaIndex];
    } else {
      return -1;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    /*changes.rubricSelections.currentValue.forEach((criteriaIndex, index) => {
      this.rubricSelections[index] = (this.rubricSelections[index] === null) ? null:this.rubricSelections[index];
    });
    changes.rubric.currentValue.criterias.forEach((criteria: IRubricCriteria, index) => {
      this.rubricSelections[index] = (this.rubricSelections[index] === null) ? null:this.rubricSelections[index];
      if(this.rubricSelections[index])
        this.totalTally += (this.rubricSelections[index] === null) ? 0:parseFloat("" + this.rubric.criterias[index].levels[this.rubricSelections[index]].score);
    })*/
    this.getTotalMark();
  }



}
