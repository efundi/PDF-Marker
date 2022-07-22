import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {FileExplorerModalComponent} from '../file-explorer-modal/file-explorer-modal.component';
import {AlertService} from '../../services/alert.service';
import {AppService} from '../../services/app.service';
import {ImportService} from '../../services/import.service';
import {AssignmentService} from '../../services/assignment.service';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {WorkspaceService} from '../../services/workspace.service';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {IRubricName} from '@shared/info-objects/rubric.class';
import {RubricService} from '../../services/rubric.service';
import {ImportInfo} from '@shared/info-objects/import.info';
import {BusyService} from '../../services/busy.service';
import {forkJoin, Observable, Subscription, tap, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';
import {isNil} from 'lodash';

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit, OnDestroy {

  readonly isAssignmentName: boolean = true;

  isFileLoaded = false;

  importForm: FormGroup;

  private formSubscriptions: Subscription[] = [];

  isModalOpened = false;

  isValidFormat: boolean;

  rubrics: IRubricName[];

  workspaces: string[] = [];

  selected: string;

  private actualFilePath: string;
  assignmentTypes = [
    {'name': 'Assignment'},
    {'name': 'Generic'}];

  private static getAssignmentNameFromFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }

  constructor(private fb: FormBuilder,
              private dialog: MatDialog,
              private alertService: AlertService,
              private appService: AppService,
              private importService: ImportService,
              private rubricService: RubricService,
              private busyService: BusyService,
              private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService) {

    this.initForm();
  }

  ngOnInit() {
    this.busyService.start();
    forkJoin([
      this.loadRubrics(),
      this.loadWorkspaces()
    ]).subscribe({
      error: (reason) => {
        this.appService.openSnackBar(false, reason);
        this.busyService.stop();
      },
      next: () => {
        this.busyService.stop();
      }
    });
  }

  ngOnDestroy() {
    this.formSubscriptions.forEach(s => s.unsubscribe());
  }

  private loadWorkspaces(): Observable<string[]> {
    return this.workspaceService.getWorkspaces()
      .pipe(
        catchError(() => throwError(() => 'Unable to retrieve workspaces')),
        tap((workspaces) => {
          if (workspaces) {
            this.workspaces = workspaces.map(item => {
              return PdfmUtilsService.basename(item);
            });
          }
          if (this.workspaces.length <= 1) {
            this.importForm.controls.workspaceFolder.setValue(DEFAULT_WORKSPACE);
          }
        })
      );
  }

  private loadRubrics(): Observable<IRubricName[]> {
    return this.rubricService.getRubricNames().pipe(
      catchError(() => throwError(() => 'Unable to retrieve rubrics')),
      tap((rubrics: IRubricName[]) => this.rubrics = rubrics)
    );
  }

  private initForm() {
    this.importForm = this.fb.group({
      assignmentType: [null],
      assignmentZipFileText: [null],
      assignmentName: [null],
      workspaceFolder: [null, Validators.required],
      noRubric: [false],
      rubric: [null, Validators.required]
    });

    this.formSubscriptions.push(this.importForm.controls.assignmentType.valueChanges.subscribe((type) => {
        this.validateZipFile(this.actualFilePath, type);
      })
    );

    this.formSubscriptions.push(this.importForm.controls.rubric.valueChanges.subscribe((value) => {
        if (!isNil(value)) {
          this.importForm.patchValue({
            noRubric: false
          }, {emitEvent: false});
        }
      })
    );

    this.formSubscriptions.push(this.importForm.controls.noRubric.valueChanges.subscribe((noRubric) => {
        const rubricControl = this.importForm.get('rubric');
        if (noRubric === true) {
          rubricControl.validator = null;
          this.importForm.patchValue({
            rubric: null
          }, {emitEvent: false});
        } else {
          rubricControl.validator = Validators.required;
        }
        rubricControl.updateValueAndValidity();
      })
    );
  }

  selectFile() {
    this.busyService.start();
    this.appService.getFile({ name: 'Zip Files', extension: ['zip'] })
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        this.busyService.stop();
        if (appSelectedPathInfo.selectedPath) {
          this.actualFilePath = appSelectedPathInfo.selectedPath;
        }

        this.onFileChange(appSelectedPathInfo);
        if (appSelectedPathInfo.error) {
          this.alertService.error(appSelectedPathInfo.error.message);
        }
      });
  }

  onFileChange(appSelectedPathInfo: AppSelectedPathInfo) {
    this.importForm.patchValue({
      assignmentZipFileText: (appSelectedPathInfo) ? appSelectedPathInfo.basename : '',
      assignmentName: appSelectedPathInfo ? ImportComponent.getAssignmentNameFromFilename(appSelectedPathInfo.fileName) : ''
    });
    this.validateZipFile(this.actualFilePath, this.importForm.value.assignmentType);
  }

  private validateZipFile(file: string, type: string): void {
    if (isNil(file) || isNil(type)) {
      // Can't validate without these
      return;
    }

    this.busyService.start();
    this.alertService.clear();
    this.importService.validateZipFile(file, type).subscribe({
      next: () => {
        this.alertService.clear();
        this.isValidFormat = true;
        this.isFileLoaded = true;
        this.busyService.stop();
      }, error: (error) => {
        this.isValidFormat = false;
        this.alertService.error(error);
        this.busyService.stop();
      }
    });
  }


  get fc() {
    return this.importForm.controls;
  }



  onPreview() {
    this.busyService.start();
    this.importService.getZipEntries(this.actualFilePath)
      .subscribe((treeNodes) => {

        this.busyService.stop();
        const config = new MatDialogConfig();
        config.data = {
          treeNodes,
          filename : treeNodes[0].name
        };

        const isModalOpenedFn = () => {
          this.isModalOpened = !this.isModalOpened;
        };

        const reference = this.appService.createDialog(FileExplorerModalComponent, config, isModalOpenedFn);
        reference.beforeClosed().subscribe(() => {
        });
      });
    this.isModalOpened = !this.isModalOpened;
  }

  onSubmit() {
    this.alertService.clear();
    if (this.importForm.invalid || !this.isValidFormat) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }

    const {
      assignmentName,
      noRubric,
      rubric,
      workspaceFolder,
      assignmentType
    } = this.importForm.value;

    const importData: ImportInfo = {
      file: this.actualFilePath,
      workspace: workspaceFolder,
      noRubric: noRubric,
      rubricName: rubric,
      assignmentName: assignmentName,
      assignmentType: assignmentType
    };
    this.busyService.start();
    this.importService.importAssignmentFile(importData).subscribe({
      next: (msg) => {
        this.busyService.stop();
        this.alertService.success(msg);
        this.resetForm();
      },
      error: () => this.busyService.stop()
    });
  }

  private resetForm() {
    this.importForm.reset();
    this.actualFilePath = null;
    this.isFileLoaded = false;
    this.isModalOpened = false;
    this.isValidFormat = false;
    this.fc.noRubric.setValue(false);
    this.fc.rubric.enable();
    this.assignmentService.refreshWorkspaces().subscribe();
  }
}
