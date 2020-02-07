import {Component, ComponentFactory, ComponentFactoryResolver, Inject, OnInit} from '@angular/core';
import {AppService} from "@coreModule/services/app.service";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {RubricViewBlockComponent} from "@pdfMarkerModule/components/rubric-view-block/rubric-view-block.component";
import {IRubricCriteria} from "@coreModule/utils/rubric.class";


@Component({
  selector: 'pdf-marker-rubric-view',
  templateUrl: './rubric-view.component.html',
  styleUrls: ['./rubric-view.component.scss'],
})
export class RubricViewComponent implements OnInit {

  rubricBlocks:  IRubricCriteria[];
  rubricName: string;


  constructor(private appService: AppService, private dialogRef: MatDialogRef<RubricViewComponent>,
              @Inject(MAT_DIALOG_DATA) config) {

  this.rubricName = config.name;
  this.rubricBlocks = config.criterias;
  }


  ngOnInit() {


  }

}
