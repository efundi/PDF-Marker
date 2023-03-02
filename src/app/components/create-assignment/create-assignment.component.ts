import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {RxwebValidators} from '@rxweb/reactive-form-validators';
import {AlertService} from '../../services/alert.service';
import {AssignmentService} from '../../services/assignment.service';
import {AppService} from '../../services/app.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ImportService} from '../../services/import.service';
import {RoutesEnum} from '../../utils/routes.enum';
import {MatDialogConfig} from '@angular/material/dialog';
import {ConfirmationDialogComponent} from '../confirmation-dialog/confirmation-dialog.component';
import {WorkspaceService} from '../../services/workspace.service';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {IRubricName} from '@shared/info-objects/rubric.class';
import {AssignmentInfo, AssignmentSubmissionInfo} from '@shared/info-objects/assignment.info';
import {RubricService} from '../../services/rubric.service';
import {find, findIndex, isEmpty, isEqual, isNil, times} from 'lodash';
import {forkJoin, mergeMap, Observable, of, tap, throwError} from 'rxjs';
import {BusyService} from '../../services/busy.service';
import {catchError, map} from 'rxjs/operators';
import {StudentSubmissionTreeNode, TreeNodeType} from '@shared/info-objects/workspaceTreeNode';
import {DEFAULT_WORKSPACE, SUPPORTED_SUBMISSION_TYPES} from '@shared/constants/constants';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';

type StudentFormGroup = FormGroup<{
  studentId: FormControl<string>,
  studentName: FormControl<string>,
  studentSurname: FormControl<string>,
  submissionFilePath: FormControl<string>,
  submissionFileName: FormControl<string>,
}>;

interface StudentSubmissionModel {
  studentId: string;
  studentName: string;
  studentSurname: string;
  submissionFileName: string;
  submissionFilePath: string;
}

interface AssignmentModel {
  assignmentName: string;
  workspaceFolder: string;
  rubric: string;
  submissions: StudentSubmissionModel[];

}

@Component({
  selector: 'pdf-marker-create-assignment',
  templateUrl: './create-assignment.component.html',
  styleUrls: ['./create-assignment.component.scss']
})
export class CreateAssignmentComponent implements OnInit, OnDestroy {

  createAssignmentForm: FormGroup<{
    assignmentName: FormControl<string>,
    workspaceFolder: FormControl<string>,
    rubric: FormControl<string>,
    submissions: FormArray<StudentFormGroup>
  }>;

  originalAssignmentModel: AssignmentModel = null;

  rubrics: IRubricName[];

  workspaces: string[] = [];

  @ViewChild('assignmentName', {static: true})
  assignmentName: ElementRef;

  constructor(private formBuilder: FormBuilder,
              private alertService: AlertService,
              private busyService: BusyService,
              private assignmentService: AssignmentService,
              private appService: AppService,
              private workspaceService: WorkspaceService,
              private router: Router,
              private activatedRoute: ActivatedRoute,
              private importService: ImportService,
              private rubricService: RubricService) {

    this.initForm();
  }

  ngOnInit() {
    this.busyService.start();

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



    this.activatedRoute.params
      .pipe(
        mergeMap((params) => {
          this.busyService.start();
          const model: AssignmentModel = {
            assignmentName: params['id'],
            workspaceFolder: params['workspaceName'],
            rubric: '',
            submissions: []
          };
          if (isNil(params['id'])) {
            this.originalAssignmentModel = null;
            return of(model);
          } else {
            this.disableFields(); // Disable fields that may not be changed when editing an existing assignment
            return this.assignmentService.getAssignmentSettings(model.workspaceFolder, model.assignmentName)
              .pipe(
                tap((assignmentSettings) => {
                  if (assignmentSettings.rubric) {
                    model.rubric = assignmentSettings.rubric.name;
                  }
                }),
                mergeMap(() => this.assignmentService.getAssignmentHierarchy(model.workspaceFolder, model.assignmentName)),
                tap((workspaceAssignment) => {
                  if (!isNil(workspaceAssignment)) {
                    workspaceAssignment.children.filter((c => c.type === TreeNodeType.SUBMISSION))
                      .forEach((studentSubmission: StudentSubmissionTreeNode) => {
                        const studentSubmissionModel: StudentSubmissionModel = {
                          studentName: studentSubmission.studentName,
                          studentSurname: studentSubmission.studentSurname,
                          studentId: studentSubmission.studentId,
                          submissionFileName: '',
                          submissionFilePath: null
                        };
                        const submissionDirectory = find(studentSubmission.children, {type: TreeNodeType.SUBMISSIONS_DIRECTORY});
                        // Here we are taking the first submission file we find
                        if (submissionDirectory && submissionDirectory.children.length > 0) {
                          studentSubmissionModel.submissionFileName = submissionDirectory.children[0].name;
                        }
                        model.submissions.push(studentSubmissionModel);
                      });
                  }
                }),
                map(() => model),
                tap((m) => this.originalAssignmentModel = m)
              );
          }
        })
      ).subscribe({
      next: (model) => {
        this.createAssignmentForm.controls.submissions.clear({emitEvent: false});
        // Create student rows
        if (isEmpty(model.submissions)) {
          this.addNewRow();
        } else {
          times(model.submissions.length, () => {
            this.submissions.push(this.newFormGroupRow(true));
          });
        }
        this.createAssignmentForm.reset(model);
        this.busyService.stop();
      },
      error: () => {
        this.busyService.stop();
        this.router.navigate([RoutesEnum.ASSIGNMENT_UPLOAD]);
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
      tap((rubrics) => {
        this.rubrics = rubrics;
      })
    );
  }


  private disableFields() {
    this.createAssignmentForm.controls.assignmentName.disable({emitEvent: false});
    this.createAssignmentForm.controls.workspaceFolder.disable({emitEvent: false});
    this.createAssignmentForm.controls.rubric.disable({emitEvent: false});
  }

  private initForm() {
    this.createAssignmentForm = this.formBuilder.group({
      assignmentName: [null as string, Validators.compose([Validators.required, Validators.maxLength(50), Validators.minLength(1)])],
      rubric: new FormControl(''),
      workspaceFolder: [null as string, Validators.required],
      submissions: this.formBuilder.array([] as StudentFormGroup[])
    });
  }

  private newFormGroupRow(disabled = false): StudentFormGroup {
    return this.formBuilder.group({
      studentId: new FormControl({
        value: null,
        disabled
      }, {
        validators : [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(50),
          RxwebValidators.unique()
        ]
      }),
      studentName: new FormControl({
        value: null,
        disabled
      }, {
        validators: [
          Validators.required
        ]
      }),
      studentSurname: new FormControl({
        value: null,
        disabled
      }, {
        validators: [
          Validators.required
        ]
      }),
      submissionFileName: new FormControl({
        value: null,
        disabled
      }, {
        validators: [
          Validators.required
        ]
      }),
      submissionFilePath: new FormControl({value: null, disabled})
    });
  }

  addNewRow() {
    this.submissions.push(this.newFormGroupRow());
  }


  get submissions(): FormArray<StudentFormGroup> {
    return this.createAssignmentForm.controls.submissions;
  }

  studentFormGroupAtIndex(index: number): StudentFormGroup {
    return this.submissions.controls[index];
  }



  selectFile(studentIndex: number) {
    this.busyService.start();
    this.appService.getFile({
      filters: SUPPORTED_SUBMISSION_TYPES
    }).subscribe({
      next: (appSelectedPathInfo: AppSelectedPathInfo) => {
        this.busyService.stop();
        if (appSelectedPathInfo.selectedPath) {
          this.onFileChange(studentIndex, appSelectedPathInfo.selectedPath);
        }
        if (appSelectedPathInfo.error) {
          this.alertService.error(appSelectedPathInfo.error.message);
        }
      }, error: () => {
        this.busyService.stop();
      }
    });
  }

  private onFileChange(studentIndex: number, filePath: string) {
    this.studentFormGroupAtIndex(studentIndex).patchValue({
      submissionFilePath: filePath,
      submissionFileName: PdfmUtilsService.basename(filePath)
    });
  }

  onStudentInfoRemove(studentIndex: number) {
    if (this.submissions.length === 1) {
      this.alertService.error('Your assignment should have at least one entry');
      this.appService.openSnackBar(false, 'Your assignment should have at least one entry');
      return;
    }

    const selectedStudentId: string = this.studentFormGroupAtIndex(studentIndex).controls.studentId.value;
    let found = false;
    if (this.originalAssignmentModel) {
      found = findIndex(this.originalAssignmentModel.submissions, s => s.studentId === selectedStudentId) >= 0;
    }

    if (found) {
      const config = new MatDialogConfig();
      config.width = '400px';
      config.maxWidth = '400px';
      config.data = {
        title: 'Confirmation',
        message: 'This record was previously saved, are you sure you want to continue?'
      };

      this.appService.createDialog(ConfirmationDialogComponent, config, (shouldContinue: boolean) => {
        if (shouldContinue) {
          this.submissions.removeAt(studentIndex);
        }
      });
    } else {
      this.submissions.removeAt(studentIndex);
    }
  }

  onSubmit() {
    this.alertService.clear();
    if (this.createAssignmentForm.invalid || this.submissions.invalid) {
      this.alertService.error('Please fill in the correct details!');
      this.appService.openSnackBar(false, 'Please fill in the correct details!');
      return;
    }

    if (this.originalAssignmentModel) {
      this.onEdit();
    } else {
      this.onCreate();
    }
  }

  private populateAssignmentInfo(): AssignmentInfo {
    const formValue: AssignmentModel = this.createAssignmentForm.getRawValue();

    const assignmentInfo: AssignmentInfo = {
      assignmentName: formValue.assignmentName,
      workspace: formValue.workspaceFolder,
      rubric: formValue.rubric === '' ? null : formValue.rubric,
      submissions: formValue.submissions.map((submission) => {
        return {
          studentId: submission.studentId,
          studentName: submission.studentName,
          studentSurname: submission.studentSurname,
          submissionFilePath: submission.submissionFilePath
        } as AssignmentSubmissionInfo;
      })
    };
    return assignmentInfo;
  }

  private onEdit() {
    const assignmentInfo = this.populateAssignmentInfo();
    if (assignmentInfo.submissions.length === 0) {
      this.deletionErrorMessage();
      return;
    }
    this.performUpdate(assignmentInfo);
  }

  private onCreate() {
    const assignmentInfo = this.populateAssignmentInfo();
    this.performCreate(assignmentInfo);
  }

  private performCreate(createAssignmentInfo: AssignmentInfo) {
    this.busyService.start();
    this.assignmentService.createAssignment(createAssignmentInfo).subscribe({
      next: () => {
        this.originalAssignmentModel = null;
        this.createAssignmentForm.reset();
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

  private performUpdate(updateAssignment: AssignmentInfo) {
    this.assignmentService.updateAssignment(updateAssignment).subscribe({
      next: () => {
        this.originalAssignmentModel = null;
        this.createAssignmentForm.reset();
        if (PdfmUtilsService.isDefaultWorkspace(updateAssignment.workspace)) {
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, updateAssignment.assignmentName]);
        } else {
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, updateAssignment.assignmentName, updateAssignment.workspace]);
        }
      },
      error: (error) => {
        this.alertService.error(error);
        this.busyService.stop();
      }
    });
  }

  private deletionErrorMessage() {
    this.alertService.error('Your assignment should have at least one entry');
    this.appService.openSnackBar(false, 'Your assignment should have at least one entry');
  }

  hasUnsavedChanges(): boolean {
    if (this.createAssignmentForm.dirty && this.createAssignmentForm.invalid) {
      return true; // You must still be busy for the form to be invalid and dirty
    }

    if (!isNil(this.originalAssignmentModel)) {
      // If we are editing an existing assignment, and the values don't match
      const formValue: AssignmentModel = this.createAssignmentForm.getRawValue();
      return !isEqual(formValue, this.originalAssignmentModel);
    }

    return false;
  }

  ngOnDestroy(): void {
  }
}
