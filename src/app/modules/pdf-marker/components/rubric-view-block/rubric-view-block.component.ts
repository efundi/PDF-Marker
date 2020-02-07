import {Component, Input, OnInit} from '@angular/core';
import {IRubricCriteria} from "@coreModule/utils/rubric.class";

@Component({
  selector: 'pdf-marker-rubric-view-block',
  templateUrl: './rubric-view-block.component.html',
  styleUrls: ['./rubric-view-block.component.scss']
})
export class RubricViewBlockComponent implements OnInit {

  @Input() criteriaBlock:IRubricCriteria;

  rubricBlockLabel: string; // Exceeds, Good, etc
  rubricBlockPositionX: number; // Position in table 0,0 - 0,1 - 0,2 - 1,0 etc.
  rubricBlockPositionY: number;
  rubricBlockScoreValue: number;
  rubricBlockDescrpiton: string;
  isSelected: boolean;

  constructor() {

  }

  ngOnInit() {
    console.log(this.criteriaBlock);

  }

}
