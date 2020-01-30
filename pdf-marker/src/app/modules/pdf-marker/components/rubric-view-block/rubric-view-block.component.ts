import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'pdf-marker-rubric-view-block',
  templateUrl: './rubric-view-block.component.html',
  styleUrls: ['./rubric-view-block.component.scss']
})
export class RubricViewBlockComponent implements OnInit {

  rubricBlocLabel: string; // Exceeds, Good, etc
  rubricBlockPositionX: number; // Position in table 0,0 - 0,1 - 0,2 - 1,0 etc.
  rubricBlockPositionY: number;
  rubricBlockScoreValue: number;
  rubricBlockDescrpiton: string;
  isSelected: boolean;

  constructor() {
    this.isSelected = false;
    this.rubricBlocLabel ="Exceeds";
    this.rubricBlockScoreValue = 4.0;
    this.rubricBlockDescrpiton = "• The writing creatively engages the reader through the telling of a story about a problem, situation, or observation" +
      "• The story has a narrator and well-developed characters" +
      "• Any questions posed by or requirements provided by the prompt are met and thoughtfully incorporated into the writing. • The writing creatively engages the reader through the telling of a story about a problem, situation, or observation";
  }

  ngOnInit() {
  }

  onClickSelection() {
    console.log("Clicked Block!");
    this.isSelected = !this.isSelected;
    console.log(this.isSelected);
  }
}
