import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormArray, FormBuilder, FormGroup, Validators} from "@angular/forms";
import {RxwebValidators} from "@rxweb/reactive-form-validators";
import {AlertService} from "@coreModule/services/alert.service";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {AppService} from "@coreModule/services/app.service";
import {ActivatedRoute, Router} from "@angular/router";
import {IRubric, IRubricName} from "@coreModule/utils/rubric.class";
import {ImportService} from "@pdfMarkerModule/services/import.service";
import {MimeTypesEnum} from "@coreModule/utils/mime.types.enum";
import {RoutesEnum} from "@coreModule/utils/routes.enum";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {AssignmentDetails} from "@pdfMarkerModule/components/assignment-overview/assignment-overview.component";
import {SakaiService} from "@coreModule/services/sakai.service";

@Component({
  selector: 'pdf-marker-create-assignment',
  templateUrl: './create-assignment.component.html',
  styleUrls: ['./create-assignment.component.scss']
})
export class CreateAssignmentComponent implements OnInit {

  createAssignmentForm: FormGroup;
  private readonly noRubricDefaultValue: boolean = false;
  private studentFiles: File[] = [];

  isRubric: boolean = true;

  rubrics: IRubricName[];

  selectedRubric: IRubric;

  isEdit: boolean = false;

  readonly MimeTypesEnum = MimeTypesEnum;

  readonly regEx = /(.*)\((.+)\)/;

  private readonly submissionFolder = "Submission attachment(s)";

  private assignmentId :string;

  // @ts-ignore
  @ViewChild("assignmentName") assignmentName: ElementRef;

  private assignmentSettings: AssignmentSettingsInfo;

  constructor(private fb: FormBuilder,
              private alertService: AlertService,
              private assignmentService: AssignmentService,
              private appService: AppService,
              private router: Router,
              private activatedRoute: ActivatedRoute,
              private importService: ImportService,
              private sakaiService: SakaiService) {}

  ngOnInit() {
    this.initForm();
    this.activatedRoute.params.subscribe(params => {
      let id = params['id'];
      if(id && !!this.assignmentService.getSelectedAssignment()) {
        const fields = ["assignmentName", "noRubric", "rubric"];
        this.assignmentId = id;
        this.isEdit = true;
        this.fc.assignmentName.setValue(this.assignmentId);
        this.assignmentService.getAssignmentSettings(id).subscribe((assignmentSettings: AssignmentSettingsInfo) => {
          this.assignmentSettings = assignmentSettings;
          if(this.assignmentSettings.rubric) {
            this.selectedRubric = this.assignmentSettings.rubric;
            this.fc.noRubric.setValue(this.noRubricDefaultValue);
            this.fc.rubric.setValue(this.assignmentSettings.rubric.name);
          } else {
            this.fc.noRubric.setValue(!this.noRubricDefaultValue);
          }
          this.disableFields(this.createAssignmentForm, fields);
          this.generateStudentDetailsFromModel();
        });
      } else {
        this.router.navigate([RoutesEnum.ASSIGNMENT_UPLOAD]);
      }
    });

    this.importService.getRubricDetails().subscribe((rubrics: IRubricName[]) => {
      this.rubrics = rubrics;
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, "Unable to retrieve rubrics");
      this.appService.isLoading$.next(false);
    });

    if(!this.isEdit)
      this.addNewRow();
  }

  private generateStudentDetailsFromModel() {
    const hierarchyModel = this.assignmentService.getSelectedAssignment();

    let values: AssignmentDetails[] = [];
    Object.keys(hierarchyModel[this.assignmentId]).forEach(key => {
      if(this.regEx.test(key) && this.sakaiService.getassignmentRootFiles().indexOf(key) === -1) {
        let value: AssignmentDetails = {
          studentName: '',
          studentNumber: '',
          assignment: '',
        };
        const matches = this.regEx.exec(key);
        value.studentName = matches[1];
        value.studentNumber = matches[2];
        value.assignment = hierarchyModel[this.assignmentId][key][this.submissionFolder] ? Object.keys(hierarchyModel[this.assignmentId][key][this.submissionFolder])[0]:'';
        values.push(value);
      }
    });

    this.populateStudentDetails(values);
  }

  private populateStudentDetails(studentDetails: AssignmentDetails[]) {
    const fields = ["studentId", "studentName", "studentSurname", "studentSubmission"];
    for(let i = 0; i < studentDetails.length; i++) {
      const studentFormGroup: FormGroup = this.newFormGroupRowFromData(studentDetails[i]);
      (this.fc.studentRow as FormArray).push(studentFormGroup);
      this.studentFiles.push(new File([""], studentDetails[i].assignment));
      //this.disableFields(studentFormGroup, fields);
    }
    this.addNewRow();
  }

  private disableField(formGroup: FormGroup, fieldName: string) {
    formGroup.get(fieldName).disable();
  }

  private disableFields(formGroup: FormGroup, fields: string[]) {
    fields.forEach(fieldName => {
      formGroup.get(fieldName).disable();
    })
  }

  private initForm() {
    this.createAssignmentForm = this.fb.group({
      assignmentName: [null, [Validators.required, Validators.maxLength(50)]],
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required],
      studentRow: this.fb.array([])
    });

    this.assignmentName.nativeElement.focus();
  }

  private newFormGroupRow(): FormGroup {
    return this.fb.group({
      studentId: [null, [Validators.required, Validators.minLength(5), Validators.maxLength(50), RxwebValidators.unique()]],
      studentName:[null, Validators.required],
      studentSurname: [null, Validators.required],
      studentSubmission: [null, Validators.required],
      studentSubmissionText: [null],
      readonly: [false],
      shouldDelete: [false]
    });
  }

  private newFormGroupRowFromData(data: AssignmentDetails): FormGroup {
    const studentNameSplit = data.studentName.split(",");

    return this.fb.group({
      studentId: [data.studentNumber, [Validators.required, Validators.minLength(5), Validators.maxLength(50), RxwebValidators.unique()]],
      studentName:[(studentNameSplit.length == 2) ? studentNameSplit[1].trim():"N/A", Validators.required],
      studentSurname: [(studentNameSplit.length == 2) ? studentNameSplit[0].trim():"N/A", Validators.required],
      studentSubmission: [data.assignment],
      studentSubmissionText: [data.assignment],
      readonly: [true],
      shouldDelete: [false]
    });
  }

  addNewRow() {
    if(this.studentRow.valid) {
      (this.fc.studentRow as FormArray).push(this.newFormGroupRow());
    }
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
      if(file && file.type === MimeTypesEnum.PDF) {
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
    if(this.studentRow.length == 1) {
      this.alertService.error("Your assignment should have at least one entry");
      this.studentFormGroupAtIndex(0).controls.shouldDelete.setValue(false);
      return;
    }

    this.studentRow.controls.splice(studentIndex, 1);
    this.studentFiles.splice(studentIndex, 1);
    this.studentRow.updateValueAndValidity();
  }

  onSubmit(event) {
    this.alertService.clear();
    if(this.createAssignmentForm.invalid || this.studentRow.invalid) {
      this.alertService.error("Please fill in the correct details!");
      return;
    } else if(this.isEdit && this.studentRow.length == 1) {
      this.alertService.error("Your assignment should have at least one entry");
      this.studentFormGroupAtIndex(0).controls.shouldDelete.setValue(false);
      return;
    }

    const formValue: any = this.createAssignmentForm.value;
    let formData: FormData = new FormData();
    const studentData: any= [];

    let count = 0;
    formValue.studentRow.map((studentRow: any) => {
      let student: any = {};
      student.studentId = studentRow.studentId.trim();
      student.studentName = studentRow.studentName.trim();
      student.studentSurname = studentRow.studentSurname.trim();
      if(studentRow.shouldDelete)
        student.remove = true;
      formData.append('file' + count, this.studentFiles[count]);
      studentData.push(student);
      count++;
    });
    formData.append('isEdit', 'true');
    formData.append('studentDetails', JSON.stringify(studentData));
    if(this.isEdit) {
      formData.append('assignmentName', this.assignmentId);
      this.assignmentService.updateAssignment(formData).subscribe(model => {
        this.assignmentService.getAssignments().subscribe((assignments) => {
          this.assignmentService.setSelectedAssignment(model);
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW]).then(() => this.assignmentService.update(assignments));
          this.appService.isLoading$.next(false);
        });
      }, error => {
        this.appService.isLoading$.next(false);
      })
    } else {
      const {
        assignmentName,
        noRubric,
        rubric
      } = this.createAssignmentForm.value;
      formData.append('assignmentName', assignmentName.trim());
      formData.append('noRubric', noRubric);
      formData.append('rubric', rubric);
      this.appService.isLoading$.next(true);
      this.assignmentService.createAssignment(formData).subscribe((model) => {
        this.assignmentService.getAssignments().subscribe((assignments) => {
          this.assignmentService.setSelectedAssignment(model);
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW]).then(() => this.assignmentService.update(assignments));
          this.appService.isLoading$.next(false);
        });
      }, error => {
        this.appService.isLoading$.next(false);
      });
    }
  }
}
