import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
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
import {MatDialogConfig} from "@angular/material/dialog";
import {YesAndNoConfirmationDialogComponent} from "@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component";

@Component({
  selector: 'pdf-marker-create-assignment',
  templateUrl: './create-assignment.component.html',
  styleUrls: ['./create-assignment.component.scss']
})
export class CreateAssignmentComponent implements OnInit, OnDestroy {

  createAssignmentForm: FormGroup;

  private readonly noRubricDefaultValue: boolean = false;

  private studentFiles: File[] = [];

  isRubric: boolean = true;

  rubrics: IRubricName[];

  selectedRubric: IRubric;

  isEdit: boolean = false;

  title: string = "Upload PDF Files";

  readonly MimeTypesEnum = MimeTypesEnum;

  readonly regEx = /(.*)\((.+)\)/;

  private readonly submissionFolder = "Submission attachment(s)";

  private assignmentId :string;

  workspaces: String[];
  selectedWorkspace: string;

  // @ts-ignore
  @ViewChild("assignmentName") assignmentName: ElementRef;

  private assignmentSettings: AssignmentSettingsInfo;

  private studentDetails:any[] = [];

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
        this.title = "Manage Submissions";
        const fields = ["assignmentName", "noRubric", "rubric"];
        this.assignmentId = id;
        this.isEdit = true;
        this.fc.assignmentName.setValue(this.assignmentId);
        this.assignmentService.getAssignmentSettings(id).subscribe((assignmentSettings: AssignmentSettingsInfo) => {
          this.assignmentSettings = assignmentSettings;
          if (this.assignmentSettings.rubric) {
            this.selectedRubric = this.assignmentSettings.rubric;
            this.fc.noRubric.setValue(this.noRubricDefaultValue);
            this.fc.rubric.setValue(this.assignmentSettings.rubric.name);
          } else {
            this.fc.noRubric.setValue(!this.noRubricDefaultValue);
          }
          this.disableFields(this.createAssignmentForm, fields);
          this.generateStudentDetailsFromModel();
        });
        this.assignmentService.getWorkspaces().subscribe((workspaces: String[]) => {
          this.workspaces = workspaces;
          this.workspaces[0] = "Default Workspace";
          for(var x = 1; x < this.workspaces.length+1; x++) {
            this.workspaces[x] = this.workspaces[x].substr(this.workspaces[x].lastIndexOf("\\")+1, this.workspaces[x].length);
          }
          console.log(this.workspaces);
          this.appService.isLoading$.next(false);
        }, error => {
          this.appService.openSnackBar(false, "Unable to retrieve workspaces");
          this.appService.isLoading$.next(false);
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

    const values: AssignmentDetails[] = [];
    if(hierarchyModel[this.assignmentId]) {
      Object.keys(hierarchyModel[this.assignmentId]).forEach(key => {
        if (this.regEx.test(key) && this.sakaiService.getAssignmentRootFiles().indexOf(key) === -1) {
          const value: AssignmentDetails = {
            studentName: '',
            studentNumber: '',
            assignment: '',
          };
          const matches = this.regEx.exec(key);
          value.studentName = matches[1];
          value.studentNumber = matches[2];
          value.assignment = hierarchyModel[this.assignmentId][key][this.submissionFolder] ? Object.keys(hierarchyModel[this.assignmentId][key][this.submissionFolder])[0] : '';
          values.push(value);
        }
      });

      this.populateStudentDetails(values);
    } else {
      this.router.navigate([RoutesEnum.ASSIGNMENT_UPLOAD]);
    }
  }

  private populateStudentDetails(studentDetails: AssignmentDetails[]) {
    const fields = ["studentId", "studentName", "studentSurname", "studentSubmission"];
    for(let i = 0; i < studentDetails.length; i++) {
      const studentFormGroup: FormGroup = this.newFormGroupRowFromData(studentDetails[i]);
      (this.fc.studentRow as FormArray).push(studentFormGroup);
      this.studentFiles.push(new File([""], studentDetails[i].assignment));
    }
  }

  private disableField(formGroup: FormGroup, fieldName: string) {
    formGroup.get(fieldName).disable();
  }

  private disableFields(formGroup: FormGroup, fields: string[]) {
    fields.forEach(fieldName => {
      formGroup.get(fieldName).disable();
    });
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
      studentName: [null, Validators.required],
      studentSurname: [null, Validators.required],
      studentSubmission: [null, Validators.required],
      studentSubmissionText: [null],
      readonly: [false],
      shouldDelete: [false]
    });
  }

  private newFormGroupRowFromData(data: AssignmentDetails): FormGroup {
    const studentNameSplit = data.studentName.split(",");
    this.populateSavedState(data);
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

  private populateSavedState(data: AssignmentDetails) {
    const studentNameSplit = data.studentName.split(",");

    const studentDetails = {
      studentId: data.studentNumber,
      studentName: (studentNameSplit.length == 2) ? studentNameSplit[1].trim():"N/A",
      studentSurname: (studentNameSplit.length == 2) ? studentNameSplit[0].trim():"N/A",
      studentSubmission: data.assignment,
      shouldDelete: false
    };

    this.studentDetails.push(studentDetails);
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
    return (this.studentRow.controls[index] as FormGroup);
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
      this.appService.openSnackBar(false, "Your assignment should have at least one entry");
      this.studentFormGroupAtIndex(0).controls.shouldDelete.setValue(false);
      return;
    }

    let selectedStudentId: string = this.studentFormGroupAtIndex(studentIndex).controls.studentId.value;
    let found: boolean = false;
    let foundIndex: number;
    for(let i = 0; i < this.studentDetails.length; i++) {
      if(selectedStudentId === this.studentDetails[i].studentId) {
        foundIndex = i;
        //this.studentDetails[i].shouldDelete = true;
        found = true;
        break;
      }
    }

    if(found) {
      const config = new MatDialogConfig();
      config.width = "400px";
      config.maxWidth = "400px";
      config.data = {
        title: "Confirmation",
        message: "This record was previously saved, are you sure you want to continue?"
      };

      const shouldContinueFn = (shouldContinue: boolean) => {
        if(shouldContinue) {
          this.studentDetails[foundIndex].shouldDelete = true;
          this.studentRow.controls.splice(studentIndex, 1);
          // this.studentFiles.splice(studentIndex, 1);
          this.studentRow.updateValueAndValidity();
        } else {
          return;
        }
      };

      this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldContinueFn);
    } else {
      this.studentRow.controls.splice(studentIndex, 1);
      this.studentFiles.splice(studentIndex, 1);
      this.studentRow.updateValueAndValidity();
    }
  }

  onSubmit(event) {
    this.alertService.clear();
    if(this.createAssignmentForm.invalid || this.studentRow.invalid) {
      this.alertService.error("Please fill in the correct details!");
      this.appService.openSnackBar(false, "Please fill in the correct details!");
      return;
    }

    if(this.isEdit)
      this.onEdit();
    else
      this.onCreate();
  }

  private onEdit() {
    const formValue: any = this.createAssignmentForm.value;
    const savedState: any[] = this.studentDetails;
    let formData: FormData = new FormData();
    const studentData: any= [];
    let savedCount = 0;
    let foundItemsToDelete: boolean = false;
    let foundItemsCount = 0;

    savedState.forEach((studentDetail: any) => {
      let student: any = {};
      student.studentId = studentDetail.studentId.trim();
      student.studentName = studentDetail.studentName.trim();
      student.studentSurname = studentDetail.studentSurname.trim();
      if(studentDetail.shouldDelete) {
        student.remove = true;
        foundItemsToDelete = true;
        foundItemsCount++;
        formData.append('file' + savedCount, new File([""], studentDetail.studentSubmission));
      } else {
        formData.append('file' + savedCount, this.studentFiles[savedCount]);
      }
      studentData.push(student);
      savedCount++;
    });

    let count = 0;
    formValue.studentRow.map((studentRow: any) => {
      const foundStudent = studentData.find(stud => (stud.studentId  === studentRow.studentId.trim()));
      if (foundStudent && foundStudent.remove) {
        const student: any = {};
        student.studentId = studentRow.studentId.trim();
        student.studentName = studentRow.studentName.trim();
        student.studentSurname = studentRow.studentSurname.trim();
        formData.append('file' + savedCount++, this.studentFiles[count]);
        studentData.push(student);
      } else if (!foundStudent) {
        const student: any = {};
        student.studentId = studentRow.studentId.trim();
        student.studentName = studentRow.studentName.trim();
        student.studentSurname = studentRow.studentSurname.trim();
        formData.append('file' + savedCount++, this.studentFiles[count]);
        studentData.push(student);
      }
      count++;
    });

    if(foundItemsCount === studentData.length) {
      this.deletionErrorMessage(foundItemsCount);
      return;
    }

    formData.append('studentDetails', JSON.stringify(studentData));
    formData.append('isEdit', 'true');
    formData.append('assignmentName', this.assignmentId);

    this.performUpdate(formData);
    /*if(foundItemsToDelete) {
      const config = new MatDialogConfig();
      config.width = "400px";
      config.maxWidth = "400px";
      config.data = {
        title: "Confirmation",
        message: "There are entries that you marked for deletion, are you sure you want to continue?",
      };

      const shouldContinueFn = (shouldContinue: boolean) => {
        if(shouldContinue) {

        } else {
          return;
        }
      };
      // Create Dialog
      this.performUpdate(formData);
      this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldContinueFn);
    } else {
      this.performUpdate(formData);
    }*/
  }

  private onCreate() {
    const formValue: any = this.createAssignmentForm.value;
    let formData: FormData = new FormData();
    const studentData: any= [];
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

    const {
      assignmentName,
      noRubric,
      rubric
    } = this.createAssignmentForm.value;

    formData.append('assignmentName', assignmentName.trim());
    formData.append('noRubric', noRubric);
    formData.append('rubric', rubric);
    this.performCreate(formData);
  }

  private performCreate(formData: FormData) {
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

  private performUpdate(formData: FormData) {
    this.assignmentService.updateAssignment(formData).subscribe(model => {
      this.assignmentService.getAssignments().subscribe((assignments) => {
        this.isEdit = false;
        this.assignmentService.setSelectedAssignment(model);
        this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW]).then(() => this.assignmentService.update(assignments));
        this.appService.isLoading$.next(false);
      });
    }, error => {
      this.appService.isLoading$.next(false);
    });
  }

  private deletionErrorMessage(count: number = 1) {
    this.alertService.error("Your assignment should have at least one entry");
    this.appService.openSnackBar(false, "Your assignment should have at least one entry");
    for(let i = 0; i < count; i++)
      this.studentFormGroupAtIndex(i).controls.shouldDelete.setValue(false);
    return;
  }

  hasUnsavedChanges() {
    if(this.isEdit) {
      let found: boolean = false;
      for (let i = 0; i < this.studentDetails.length; i++) {
        if (this.studentDetails[i].shouldDelete) {
          found = true;
          break;
        }
      }

      return found || this.studentRow.length > this.studentDetails.length;
    }
    return false;
  }

  ngOnDestroy(): void {
    if(this.assignmentId && this.router.url !== RoutesEnum.ASSIGNMENT_OVERVIEW)
      this.assignmentService.setSelectedAssignment(null);
  }
}
