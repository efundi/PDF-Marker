import {Component, Inject, OnInit} from '@angular/core';
import {AppService} from "@coreModule/services/app.service";
import {MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef} from "@angular/material/dialog";
import {animate, state, style, transition, trigger} from "@angular/animations";

@Component({
  selector: 'pdf-marker-rubric-view',
  templateUrl: './rubric-view.component.html',
  styleUrls: ['./rubric-view.component.scss'],
})
export class RubricViewComponent implements OnInit {

  rubricBlocks: object[];

  constructor(private appService: AppService, private dialogRef: MatDialogRef<RubricViewComponent>,
              @Inject(MAT_DIALOG_DATA) config) {
  }

  ngOnInit() {
  }

}
