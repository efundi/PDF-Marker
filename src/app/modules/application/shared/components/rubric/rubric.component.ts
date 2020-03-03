import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {IRubric, IRubricCriteria} from "@coreModule/utils/rubric.class";
import {Router} from "@angular/router";
import {RoutesEnum} from "@coreModule/utils/routes.enum";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {AppService} from "@coreModule/services/app.service";

@Component({
  selector: 'pdf-marker-rubric',
  templateUrl: './rubric.component.html',
  styleUrls: ['./rubric.component.scss'],
})
export class RubricComponent implements OnInit, OnChanges {

  @Input()
  rubric: IRubric;

  @Input()
  private rubricSelections = [];

  @Output()
  marksUpdated: EventEmitter<any[]> = new EventEmitter<any[]>();

  maxScore: number = 0;

  totalTally: number = 0;

  isMarkingRubricPage: boolean;

  constructor(private router: Router,
              private assignmentService: AssignmentService,
              private appService: AppService) {
    this.isMarkingRubricPage = this.router.url === RoutesEnum.ASSIGNMENT_MARKER_RUBRIC;
  }

  ngOnInit() {
    this.getHighestScore(this.rubric);
    this.getTotalMark();
  }

  getHighestScore(rubric: IRubric) {
    this.rubric.criterias.forEach((value, index) => {
      let curHighest = -1;
      value.levels.forEach((value1, index1, array) => {
        if (value1.score > curHighest)
          curHighest = value1.score;
      })
      this.maxScore = this.maxScore + parseFloat(curHighest.toString());
    })
  }

  getTotalMark() {
    this.totalTally = 0;
    this.rubricSelections.forEach((criteriaLevelIndexValue, index) => {
      if (criteriaLevelIndexValue !== null) {
        this.totalTally += parseFloat("" + this.rubric.criterias[index].levels[criteriaLevelIndexValue].score);
      }
    });
  }

  selectedCriteria(criteriaLevelIndex: number, criteriaIndex) {
    if(this.isMarkingRubricPage) {
      if (this.rubricSelections[criteriaIndex] === criteriaLevelIndex)
        this.rubricSelections[criteriaIndex] = null;
      else
        this.rubricSelections[criteriaIndex] = criteriaLevelIndex;
      this.getTotalMark();
      // call assignmentService
      this.appService.isLoading$.next(true);
      this.assignmentService.saveRubricMarks(this.rubric.name, this.rubricSelections, this.totalTally).subscribe(() => {
        this.marksUpdated.emit(this.rubricSelections);
        this.appService.openSnackBar(true, "Saved");
        this.appService.isLoading$.next(false);
      }, error => {
        this.appService.openSnackBar(false, "Unable to save marks");
        this.appService.isLoading$.next(false);
      });
    }
  }

  getSelectionIndex(criteriaIndex: number): number {
    return (this.rubricSelections[criteriaIndex] === null) ? -1:this.rubricSelections[criteriaIndex];
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
