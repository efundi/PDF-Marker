import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  @ViewChild("pdfMarkerUploadDisplay", { static: false })
  pdfMarkerUploadDisplay: ElementRef;

  readonly acceptMimeType = "application/zip";

  private file: File;

  importForm: FormGroup;

  readonly noRubricDefaultValue: boolean = false;

  isRubric: boolean = true;

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.importForm = this.fb.group({
      assignmentName: [null, Validators.required],
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required]
    })
  }

  onFileChange(event) {
    if(event.target.files[0] !== undefined) {
      this.file = event.target.files[0];
      this.setFileDetailsAndAssignmentName(event.target.files[0]);
    } else {
      this.setFileDetailsAndAssignmentName(undefined);
    }
  }

  private setFileDetailsAndAssignmentName(file: File) {
    this.file = file;
    this.pdfMarkerUploadDisplay.nativeElement.value = (file) ? file.name:'';
    this.importForm.controls.assignmentName.setValue(file ? this.getAssignmentNameFromFilename(file.name):'');
  }

  private getAssignmentNameFromFilename(filename: string): string {
    const filenameSplit = filename.split("_");
    if(filenameSplit[0] !== undefined)
      return filenameSplit[0];
    else
      return '';
  }

  onRubricChange(event) {
    if(this.importForm.controls.noRubric.value) {
      this.importForm.controls.rubric.setValidators(null);
      this.importForm.controls.rubric.updateValueAndValidity();
      this.isRubric = false;
    } else {
      this.importForm.controls.rubric.setValidators(Validators.required);
      this.importForm.controls.rubric.updateValueAndValidity();
    }

    this.importForm.updateValueAndValidity();
  }
}
