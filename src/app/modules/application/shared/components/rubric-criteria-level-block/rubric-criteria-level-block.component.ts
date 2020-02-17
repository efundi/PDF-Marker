import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {IRubricCriteriaLevels} from "@coreModule/utils/rubric.class";

@Component({
  selector: 'pdf-marker-rubric-criteria-level-block',
  templateUrl: './rubric-criteria-level-block.component.html',
  styleUrls: ['./rubric-criteria-level-block.component.scss']
})
export class RubricCriteriaLevelBlockComponent implements OnInit {

  @Input()
  criteriaLevel: IRubricCriteriaLevels;

  @Output()
  selectedCriteriaLevel: EventEmitter<IRubricCriteriaLevels> = new EventEmitter<IRubricCriteriaLevels>();
  isSelected: boolean;

  constructor() {
  }

  ngOnInit() {
  }

  onCriteriaLevelClick() {
    this.selectedCriteriaLevel.emit(this.criteriaLevel);
  }

}
