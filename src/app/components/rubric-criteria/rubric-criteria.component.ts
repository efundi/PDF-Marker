import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {IRubricCriteria, IRubricCriteriaLevels} from '@shared/info-objects/rubric.class';

@Component({
  selector: 'pdf-marker-rubric-criteria',
  templateUrl: './rubric-criteria.component.html',
  styleUrls: ['./rubric-criteria.component.scss']
})
export class RubricCriteriaComponent implements OnInit {

  @Input()
  criteria: IRubricCriteria;

  @Input()
  isMarkingRubricPage: boolean;

  @Output()
  selectedCriteriaLevelIndex: EventEmitter<number> = new EventEmitter<number>();

  @Input()
  selectedCriteriaLevel = -1;

  constructor() { }

  ngOnInit() {
  }

  onCriteriaLevelClicked(criteriaLevel: IRubricCriteriaLevels, selectedIndex: number) {
    if (this.isMarkingRubricPage) {
      if (this.criteria) {
        if (selectedIndex >= 0 && selectedIndex < this.criteria.levels.length) {
          if (this.selectedCriteriaLevel === this.criteria.levels.indexOf(criteriaLevel)) {
            this.selectedCriteriaLevel = -1;
          }
          else {
            this.selectedCriteriaLevel = this.criteria.levels.indexOf(criteriaLevel);
          }
          this.selectedCriteriaLevelIndex.emit(this.criteria.levels.indexOf(criteriaLevel));
        }
      }
    }
  }
}
