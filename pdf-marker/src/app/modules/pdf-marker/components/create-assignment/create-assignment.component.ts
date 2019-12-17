import { Component, OnInit } from '@angular/core';
import {FormArray, FormBuilder, FormGroup, Validators} from "@angular/forms";
import {RxwebValidators} from "@rxweb/reactive-form-validators";
import {AlertService} from "@coreModule/services/alert.service";

@Component({
  selector: 'pdf-marker-create-assignment',
  templateUrl: './create-assignment.component.html',
  styleUrls: ['./create-assignment.component.scss']
})
export class CreateAssignmentComponent implements OnInit {

  createAssignmentForm: FormGroup;
  private readonly noRubricDefaultValue: boolean = false;

  readonly acceptMimeType = "application/pdf";
  isRubric: boolean = true;

  constructor(private fb: FormBuilder,
              private alertService: AlertService) {}

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.createAssignmentForm = this.fb.group({
      assignmentName: [null, [Validators.required, Validators.maxLength(50)]],
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required],
      studentRow: this.fb.array([])
    });

    this.addNewRow();
  }


  private newFormGroupRow(): FormGroup {
    return this.fb.group({
      studentId: [null, [Validators.required, Validators.minLength(5), Validators.maxLength(50), RxwebValidators.unique()]],
      studentName:[null, Validators.required],
      studentSurname: [null , Validators.required],
      studentSubmission: [null, Validators.required],
      studentSubmissionText: [null]
    });
  }

  addNewRow() {
    (this.fc.studentRow as FormArray).push(this.newFormGroupRow());
  }

  get fc() {
    return this.createAssignmentForm.controls;
  }

  get studentRow() {
    return this.fc.studentRow as FormArray;
  }

  studentFormGroupAtIndex(index: number): FormGroup {
    return (this.studentRow.controls[index] as FormGroup)
  }

  onRubricChange() {
    if(this.fc.noRubric.value) {
      this.fc.rubric.setValidators(null);
      this.fc.rubric.updateValueAndValidity();
      this.isRubric = false;
    } else {
      this.fc.rubric.setValidators(Validators.required);
      this.fc.rubric.updateValueAndValidity();
    }

    this.createAssignmentForm.updateValueAndValidity();
  }

  async onFileChange(studentIndex: number, event) {
    if(event.target.files[0] === undefined || event.target.files[0] === null) {
      this.studentFormGroupAtIndex(studentIndex).controls.studentSubmission.setValue(null);
      this.studentFormGroupAtIndex(studentIndex).controls.studentSubmissionText.setValue(null);
    } else {
      const file: File = await event.target.files[0];
      if(file && file.type === this.acceptMimeType) {
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmission.setErrors(null);
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmissionText.setValue(file.name);
      } else {
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmission.setErrors({file: true});
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmissionText.setValue(file.name);
      }
    }
    this.studentRow.updateValueAndValidity();
  }

  onStudentInfoRemove(studentIndex: number) {
    this.studentRow.controls.splice(studentIndex, 1);
    this.studentRow.updateValueAndValidity();
  }

  onSubmit(event) {
    if(this.createAssignmentForm.invalid || this.studentRow.invalid) {
      event.target.disabled = true;
      this.alertService.error("Please fill in the correct details!");
      return;
    }

    console.log(this.createAssignmentForm);
  }
}
