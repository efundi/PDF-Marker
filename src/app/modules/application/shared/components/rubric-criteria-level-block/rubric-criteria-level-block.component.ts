import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {IRubricCriteriaLevels} from '../../../../../../shared/info-objects/rubric.class';

@Component({
  selector: 'pdf-marker-rubric-criteria-level-block',
  templateUrl: './rubric-criteria-level-block.component.html',
  styleUrls: ['./rubric-criteria-level-block.component.scss']
})
export class RubricCriteriaLevelBlockComponent implements OnInit {

  @Input()
  criteriaLevel: IRubricCriteriaLevels;

  @Input()
  isMarkingRubricPage: boolean;

  @Output()
  selectedCriteriaLevel: EventEmitter<IRubricCriteriaLevels> = new EventEmitter<IRubricCriteriaLevels>();
  isSelected: boolean;

  constructor() {
  }

  ngOnInit() {
  }

  onCriteriaLevelClick() {
    if (this.isMarkingRubricPage) {
      this.selectedCriteriaLevel.emit(this.criteriaLevel);
    }
  }

}
