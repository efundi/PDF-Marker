import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {MatTableDataSource} from "@angular/material/table";

interface RubricDatasource {

  name: string;

  inUse?: boolean
}

interface Rubric {
  description: string;

  name: string;

  levels: RubricCriteriaLevels[]
}

interface RubricCriteriaLevels {
  score: number;

  description: string;

  label: string;
}

@Component({
  selector: 'pdf-marker-rubric-import',
  templateUrl: './rubric-import.component.html',
  styleUrls: ['./rubric-import.component.scss']
})
export class RubricImportComponent implements OnInit {

  readonly acceptMimeType = "application/json";
  readonly displayedColumns: string[] = ['title', 'actions', 'inUse'];

  rubricForm: FormGroup;
  dataSource: MatTableDataSource<RubricDatasource> = new MatTableDataSource([{id: 0, name: "Values and Ethics Rubric", inUse: false }, {id: 1, name: "Professional Values", inUse: false}]);
  rubrics: Rubric[];

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.init();
  }

  private init() {
    this.rubricForm = this.fb.group({
      rubricName: [null, Validators.required],
      rubricFile: [null, Validators.required],
      rubricFileText: [null, Validators.required]
    });
  }

  get fc() {
    return this.rubricForm.controls;
  }

  async onFileChange(event) {
    if(event.target.files[0] === undefined || event.target.files[0] === null) {
      this.fc.rubricFile.setValue(null);
      this.fc.rubricFileText.setValue(null);
    } else {
      const file: File = await event.target.files[0];
      if(file && file.type === this.acceptMimeType) {
        this.fc.rubricFile.setErrors(null);
        this.fc.rubricFileText.setValue(file.name);
        this.fc.rubricName.setValue(this.getRubricNameFromFilename(file.name));
      } else {
        this.fc.rubricFile.setErrors({file: true});
        this.fc.rubricFileText.setValue(file.name);
        this.fc.rubricName.setValue(null);
      }
    }
    //this..updateValueAndValidity();
  }

  showRubric(index: number) {
    console.log("Show Rubric at index = " + index);
  }

  deleteRubric(index: number) {
    console.log("Delete Rubric at index = " + index);
  }

  private getRubricNameFromFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, "");
  }

  onSubmit(event) {

  }

}
