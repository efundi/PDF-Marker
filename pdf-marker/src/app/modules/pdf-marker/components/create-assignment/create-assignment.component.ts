import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {RxwebValidators} from "@rxweb/reactive-form-validators";
import {AlertService} from "@coreModule/services/alert.service";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {AppService} from "@coreModule/services/app.service";
import {HttpEventType} from "@angular/common/http";
import {Router} from "@angular/router";

@Component({
  selector: 'pdf-marker-create-assignment',
  templateUrl: './create-assignment.component.html',
  styleUrls: ['./create-assignment.component.scss']
})
export class CreateAssignmentComponent implements OnInit {

  createAssignmentForm: FormGroup;
  private readonly noRubricDefaultValue: boolean = false;
  private studentFiles: File[] = [];

  readonly acceptMimeType = "application/pdf";
  isRubric: boolean = true;

  // @ts-ignore
  @ViewChild("assignmentName") assignmentName: ElementRef;


  constructor(private fb: FormBuilder,
              private alertService: AlertService,
              private assignmentService: AssignmentService,
              private appService: AppService,
              private router: Router) {}

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
      studentSurname: [null, Validators.required],
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
      this.fc.rubric.disable();
      this.isRubric = false;
    } else {
      this.fc.rubric.setValidators(Validators.required);
      this.fc.rubric.updateValueAndValidity();
      this.fc.rubric.enable();
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
        if(!this.studentFiles[studentIndex])
          this.studentFiles.push(file);
        else
          this.studentFiles[studentIndex] = file;
      } else {
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmission.setErrors({file: true});
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmissionText.setValue(file.name);
      }
    }
    this.studentRow.updateValueAndValidity();
  }

  onStudentInfoRemove(studentIndex: number) {
    this.studentRow.controls.splice(studentIndex, 1);
    this.studentFiles.splice(studentIndex, 1);
    this.studentRow.updateValueAndValidity();
  }

  onSubmit(event) {
    this.alertService.clear();
    if(this.createAssignmentForm.invalid || this.studentRow.invalid) {
      this.alertService.error("Please fill in the correct details!");
      return;
    }

    const formValue: any = this.createAssignmentForm.value;
    let formData: FormData = new FormData();
    const studentData: any= [];
    const {
      assignmentName,
      noRubric,
      rubric
    } = this.createAssignmentForm.value;

    formData.append('assignmentName', assignmentName.trim());
    formData.append('noRubric', noRubric);
    formData.append('rubric', rubric);
    let count = 0;
    formValue.studentRow.map((studentRow: any) => {
      let student: any = {};
      student.studentId = studentRow.studentId.trim();
      student.studentName = studentRow.studentName.trim();
      student.studentSurname = studentRow.studentSurname.trim();
      formData.append('file' + count, this.studentFiles[count]);
      studentData.push(student);
      count++;
    });
    formData.append('studentDetails', JSON.stringify(studentData));
    this.assignmentService.createAssignment(formData).subscribe((events) => {
      if(events.type === HttpEventType.UploadProgress) {

      } else if(events.type === HttpEventType.Response) {
        this.appService.isLoading$.next(false);
        let model: any = events.body;
        this.assignmentService.getAssignments().subscribe((assignments) => {
          this.assignmentService.setSelectedAssignment(model);
          this.router.navigate(["/marker/assignment/overview"]).then(() => this.assignmentService.update(assignments));
        });
      }
    },error => {
      this.appService.isLoading$.next(false);
    });
  }
}
