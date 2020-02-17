import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {IRubricCriteria, IRubricCriteriaLevels} from "@coreModule/utils/rubric.class";

@Component({
  selector: 'pdf-marker-rubric-criteria',
  templateUrl: './rubric-criteria.component.html',
  styleUrls: ['./rubric-criteria.component.scss']
})
export class RubricCriteriaComponent implements OnInit {

  @Input()
  criteria: IRubricCriteria;

  @Output()
  selectedCriteriaLevelIndex: EventEmitter<number> = new EventEmitter<number>();

  constructor() { }

  ngOnInit() {
  }

  onCriteriaLevelClicked(criteriaLevel: IRubricCriteriaLevels, selectedIndex: number) {
    if(this.criteria) {
      if(selectedIndex >= 0 && selectedIndex < this.criteria.levels.length) {
        this.selectedCriteriaLevelIndex.emit(this.criteria.levels.indexOf(criteriaLevel));
      }
    }
  }

}
