import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {RxwebValidators} from '@rxweb/reactive-form-validators';
import {AlertService} from '../../services/alert.service';
import {AssignmentService} from '../../services/assignment.service';
import {AppService} from '../../services/app.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ImportService} from '../../services/import.service';
import {MimeTypesEnum} from '../../utils/mime.types.enum';
import {RoutesEnum} from '../../utils/routes.enum';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {AssignmentDetails} from '../assignment-overview/assignment-overview.component';
import {MatDialogConfig} from '@angular/material/dialog';
import {
  ConfirmationDialogComponent
} from '../confirmation-dialog/confirmation-dialog.component';
import {WorkspaceService} from '../../services/workspace.service';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {UpdateAssignment, UpdateAssignmentStudentDetails} from '@shared/info-objects/update-assignment';
import {IRubric, IRubricName} from '@shared/info-objects/rubric.class';
import {CreateAssignmentInfo, StudentInfo} from '@shared/info-objects/create-assignment.info';
import {RubricService} from '../../services/rubric.service';
import {find, isNil} from 'lodash';
import {forkJoin, mergeMap, Observable, tap, throwError} from 'rxjs';
import {BusyService} from '../../services/busy.service';
import {catchError} from 'rxjs/operators';
import {StudentSubmission, TreeNodeType} from '@shared/info-objects/workspace';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';

@Component({
  selector: 'pdf-marker-create-assignment',
  templateUrl: './create-assignment.component.html',
  styleUrls: ['./create-assignment.component.scss']
})
export class CreateAssignmentComponent implements OnInit, OnDestroy {

  createAssignmentForm: UntypedFormGroup;

  private readonly noRubricDefaultValue: boolean = false;

  private studentFiles: any[] = [];

  rubrics: IRubricName[];

  selectedRubric: IRubric;

  isEdit = false;

  title = 'Upload PDF Files';

  readonly MimeTypesEnum = MimeTypesEnum;

  readonly regEx = /(.*)\((.+)\)/;

  private assignmentId: string;

  private workspaceName: string;

  workspaces: string[] = [];

  @ViewChild('assignmentName', {static: true})
  assignmentName: ElementRef;

  private assignmentSettings: AssignmentSettingsInfo;

  private studentDetails: any[] = [];

  constructor(private fb: UntypedFormBuilder,
              private alertService: AlertService,
              private busyService: BusyService,
              private assignmentService: AssignmentService,
              private appService: AppService,
              private workspaceService: WorkspaceService,
              private router: Router,
              private activatedRoute: ActivatedRoute,
              private importService: ImportService,
              private rubricService: RubricService) {}

  ngOnInit() {
    this.initForm();
    this.busyService.start();
    this.activatedRoute.params.subscribe(params => {
      this.assignmentId = params['id'];
      this.workspaceName = params['workspaceName'];
      if (!isNil(this.assignmentId)) {
        this.title = 'Manage Submissions';
        const fields = ['assignmentName', 'noRubric', 'rubric'];
        this.isEdit = true;
        this.fc.assignmentName.setValue(this.assignmentId);
        if (isNil(this.workspaceName)) {
          this.workspaceName = DEFAULT_WORKSPACE;
        }
        this.fc.workspaceFolder.setValue(this.workspaceName);
        fields.push('workspaceFolder');
        this.busyService.start();
        this.assignmentService.getAssignmentSettings(this.workspaceName, this.assignmentId).subscribe({
          next: (assignmentSettings: AssignmentSettingsInfo) => {
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
            this.busyService.stop();
          },
          error: () => this.busyService.stop()
        });
      } else {
        this.router.navigate([RoutesEnum.ASSIGNMENT_UPLOAD]);
      }
    });


    if (!this.isEdit) {
      this.addNewRow();
    }
    forkJoin([
      this.loadRubrics(),
      this.loadWorkspaces()
    ]).subscribe({
      complete: () => {
        this.busyService.stop();
      },
      error: (reason) => {
        this.appService.openSnackBar(false, reason);
        this.busyService.stop();
      }
    });


  }

  private loadWorkspaces(): Observable<string[]> {
    return this.workspaceService.getWorkspaces().pipe(
      catchError(() => throwError(() => 'Unable to retrieve workspaces')),
      tap((workspaces: string[]) => {
        if (workspaces) {
          this.workspaces = workspaces.map(item => {
            return PdfmUtilsService.basename(item);
          });
        }
        if (this.workspaces.length <= 1) {
          this.createAssignmentForm.controls.workspaceFolder.setValue(DEFAULT_WORKSPACE);
        }
      })
    );
  }

  private loadRubrics(): Observable<IRubricName[]> {
    return this.rubricService.getRubricNames().pipe(
      catchError(() => throwError(() => 'Unable to retrieve rubrics')),
      tap((rubrics) => this.rubrics = rubrics)
    );
  }


  private generateStudentDetailsFromModel() {
    this.assignmentService.getAssignmentHierarchy(this.workspaceName, this.assignmentId).subscribe((workspaceAssignment) => {
      const values: AssignmentDetails[] = [];
      if (!isNil(workspaceAssignment)) {
        workspaceAssignment.children.filter((c => c.type === TreeNodeType.SUBMISSION)).forEach((studentSubmission: StudentSubmission) => {
          const value: AssignmentDetails = {
            studentName: studentSubmission.studentName,
            studentSurname: studentSubmission.studentSurname,
            studentNumber: studentSubmission.studentId,
            assignment: null,
            pdfFile: null
          };
          const submissionDirectory = find(studentSubmission.children, {type: TreeNodeType.SUBMISSIONS_DIRECTORY});
          value.assignment = (submissionDirectory && submissionDirectory.children.length > 0) ? submissionDirectory.children[0].name : '';
          values.push(value);
        });
        this.populateStudentDetails(values);
      } else {
        this.router.navigate([RoutesEnum.ASSIGNMENT_UPLOAD]);
      }
    });
  }

  private populateStudentDetails(studentDetails: AssignmentDetails[]) {
    for (let i = 0; i < studentDetails.length; i++) {
      const studentFormGroup: UntypedFormGroup = this.newFormGroupRowFromData(studentDetails[i]);
      (this.fc.studentRow as UntypedFormArray).push(studentFormGroup);
      this.studentFiles.push(new File([''], studentDetails[i].assignment));
    }
  }

  private disableFields(formGroup: UntypedFormGroup, fields: string[]) {
    fields.forEach(fieldName => {
      formGroup.get(fieldName).disable();
    });
  }

  private initForm() {
    this.createAssignmentForm = this.fb.group({
      assignmentName: [null, Validators.compose([Validators.required, Validators.maxLength(50), Validators.minLength(1)])],
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required],
      workspaceFolder: [null, Validators.required],
      studentRow: this.fb.array([])
    });

    this.assignmentName.nativeElement.focus();
  }

  private newFormGroupRow(): UntypedFormGroup {
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

  private newFormGroupRowFromData(data: AssignmentDetails): UntypedFormGroup {
    this.populateSavedState(data);
    return this.fb.group({
      studentId: [data.studentNumber, [Validators.required, Validators.minLength(5), Validators.maxLength(50), RxwebValidators.unique()]],
      studentName: [data.studentName, Validators.required],
      studentSurname: [data.studentSurname, Validators.required],
      studentSubmission: [data.assignment],
      studentSubmissionText: [data.assignment],
      readonly: [true],
      shouldDelete: [false]
    });
  }

  private populateSavedState(data: AssignmentDetails) {
    const studentDetails = {
      studentId: data.studentNumber,
      studentName: data.studentName,
      studentSurname: data.studentSurname,
      studentSubmission: data.assignment,
      shouldDelete: false
    };

    this.studentDetails.push(studentDetails);
  }

  addNewRow() {
    if (this.studentRow.valid) {
      (this.fc.studentRow as UntypedFormArray).push(this.newFormGroupRow());
    }
  }

  get fc() {
    return this.createAssignmentForm.controls;
  }

  get studentRow() {
    return this.fc.studentRow as UntypedFormArray;
  }

  studentFormGroupAtIndex(index: number): UntypedFormGroup {
    return (this.studentRow.controls[index] as UntypedFormGroup);
  }

  onRubricChange() {
    if (this.fc.noRubric.value) {
      this.fc.rubric.setValidators(null);
      this.fc.rubric.updateValueAndValidity();
      this.fc.rubric.disable();
      this.createAssignmentForm.controls.rubric.disable();
    } else {
      this.fc.rubric.setValidators(Validators.required);
      this.fc.rubric.updateValueAndValidity();
      this.fc.rubric.enable();
      this.createAssignmentForm.controls.rubric.enable();
    }

    this.createAssignmentForm.updateValueAndValidity();
  }

  async onFileChange(studentIndex: number, event) {
    if (event.target.files[0] === undefined || event.target.files[0] === null) {
      this.studentFormGroupAtIndex(studentIndex).controls.studentSubmission.setValue(null);
      this.studentFormGroupAtIndex(studentIndex).controls.studentSubmissionText.setValue(null);
    } else {
      const file: File = await event.target.files[0];
      if (file && file.type === MimeTypesEnum.PDF) {
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmission.setErrors(null);
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmissionText.setValue(file.name);
        if (!this.studentFiles[studentIndex]) {
          this.studentFiles.push(file);
        } else {
          this.studentFiles[studentIndex] = file;
        }
      } else {
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmission.setErrors({file: true});
        this.studentFormGroupAtIndex(studentIndex).controls.studentSubmissionText.setValue(file.name);
      }
    }
    this.studentRow.updateValueAndValidity();
  }

  onStudentInfoRemove(studentIndex: number) {
    if (this.studentRow.length === 1) {
      this.alertService.error('Your assignment should have at least one entry');
      this.appService.openSnackBar(false, 'Your assignment should have at least one entry');
      this.studentFormGroupAtIndex(0).controls.shouldDelete.setValue(false);
      return;
    }

    const selectedStudentId: string = this.studentFormGroupAtIndex(studentIndex).controls.studentId.value;
    let found = false;
    let foundIndex: number;
    for (let i = 0; i < this.studentDetails.length; i++) {
      if (selectedStudentId === this.studentDetails[i].studentId) {
        foundIndex = i;
        // this.studentDetails[i].shouldDelete = true;
        found = true;
        break;
      }
    }

    if (found) {
      const config = new MatDialogConfig();
      config.width = '400px';
      config.maxWidth = '400px';
      config.data = {
        title: 'Confirmation',
        message: 'This record was previously saved, are you sure you want to continue?'
      };

      const shouldContinueFn = (shouldContinue: boolean) => {
        if (shouldContinue) {
          this.studentDetails[foundIndex].shouldDelete = true;
          this.studentRow.controls.splice(studentIndex, 1);
          // this.studentFiles.splice(studentIndex, 1);
          this.studentRow.updateValueAndValidity();
        } else {
          return;
        }
      };

      this.appService.createDialog(ConfirmationDialogComponent, config, shouldContinueFn);
    } else {
      this.studentRow.controls.splice(studentIndex, 1);
      this.studentFiles.splice(studentIndex, 1);
      this.studentRow.updateValueAndValidity();
    }
  }

  onSubmit() {
    this.alertService.clear();
    if (this.createAssignmentForm.invalid || this.studentRow.invalid) {
      this.alertService.error('Please fill in the correct details!');
      this.appService.openSnackBar(false, 'Please fill in the correct details!');
      return;
    }

    if (this.isEdit) {
      this.onEdit();
    } else {
      this.onCreate();
    }
  }

  private onEdit() {
    const formValue: any = this.createAssignmentForm.value;
    const savedState: any[] = this.studentDetails;

    const updateRequest: UpdateAssignment = {
      assignmentName: this.assignmentId,
      workspace: this.workspaceName,
      studentDetails: [],
      files: []
    };
    let savedCount = 0;
    let foundItemsToDelete = false;
    let foundItemsCount = 0;

    savedState.forEach((studentDetail: any) => {
      const student: UpdateAssignmentStudentDetails = {};
      student.studentId = studentDetail.studentId.trim();
      student.studentName = studentDetail.studentName.trim();
      student.studentSurname = studentDetail.studentSurname.trim();
      if (studentDetail.shouldDelete) {
        student.remove = true;
        foundItemsToDelete = true;
        foundItemsCount++;
        updateRequest.files.push(studentDetail.studentSubmission.path);
      } else {
        updateRequest.files.push(this.studentFiles[savedCount].path);
      }
      updateRequest.studentDetails.push(student);
      savedCount++;
    });

    let count = 0;
    formValue.studentRow.map((studentRow: any) => {
      const foundStudent = updateRequest.studentDetails.find(stud => (stud.studentId  === studentRow.studentId.trim()));
      if (foundStudent && foundStudent.remove) {
        const student: any = {};
        student.studentId = studentRow.studentId.trim();
        student.studentName = studentRow.studentName.trim();
        student.studentSurname = studentRow.studentSurname.trim();

        updateRequest.files.push(this.studentFiles[count].path);
        updateRequest.studentDetails.push(student);
      } else if (!foundStudent) {
        const student: any = {};
        student.studentId = studentRow.studentId.trim();
        student.studentName = studentRow.studentName.trim();
        student.studentSurname = studentRow.studentSurname.trim();
        updateRequest.files.push(this.studentFiles[count].path);
        updateRequest.studentDetails.push(student);
      }
      count++;
    });

    if (foundItemsCount === updateRequest.studentDetails.length) {
      this.deletionErrorMessage(foundItemsCount);
      return;
    }
    this.performUpdate(updateRequest);
  }

  private onCreate() {
    const formValue: any = this.createAssignmentForm.value;
    const createRequest: CreateAssignmentInfo = {
      assignmentName: formValue.assignmentName.trim(),
      workspace: formValue.workspaceFolder,
      noRubric: formValue.noRubric,
      rubric: formValue.rubric,
      studentRow: [],
      files: []
    };

    createRequest.studentRow = formValue.studentRow.map((studentRow: any, index: number) => {
      createRequest.files.push(this.studentFiles[index].path);
      return {
        studentId: studentRow.studentId.trim(),
        studentName: studentRow.studentName.trim(),
        studentSurname: studentRow.studentSurname.trim(),
      } as StudentInfo;
    });

    this.performCreate(createRequest);
  }

  private performCreate(createAssignmentInfo: CreateAssignmentInfo) {
    this.busyService.start();
    this.assignmentService.createAssignment(createAssignmentInfo)
      .pipe(
        mergeMap(() => this.assignmentService.refreshWorkspaces()),
      ).subscribe({
      next: () => {
        if (PdfmUtilsService.isDefaultWorkspace(createAssignmentInfo.workspace)) {
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, createAssignmentInfo.assignmentName]);
        } else {
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, createAssignmentInfo.assignmentName, createAssignmentInfo.workspace]);
        }
        this.busyService.stop();
      },
      error: (error) => {
        this.alertService.error(error);
        this.busyService.stop();
      }
    });
  }

  private performUpdate(updateAssignment: UpdateAssignment) {
    this.assignmentService.updateAssignment(updateAssignment)
      .pipe(
        mergeMap(() => this.assignmentService.refreshWorkspaces()),
      ).subscribe({
      next: () => {
        this.isEdit = false;
        if (PdfmUtilsService.isDefaultWorkspace(this.workspaceName)) {
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, this.assignmentId]);
        } else {
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, this.assignmentId, this.workspaceName]);
        }
      },
      error: (error) => {
        this.alertService.error(error);
        this.busyService.stop();
      }
    });
  }

  private deletionErrorMessage(count: number = 1) {
    this.alertService.error('Your assignment should have at least one entry');
    this.appService.openSnackBar(false, 'Your assignment should have at least one entry');
    for (let i = 0; i < count; i++) {
      this.studentFormGroupAtIndex(i).controls.shouldDelete.setValue(false);
    }
    return;
  }

  hasUnsavedChanges() {
    if (this.isEdit) {
      let found = false;
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
  }
}
