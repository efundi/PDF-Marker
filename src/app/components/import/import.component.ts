import {Component, OnInit} from '@angular/core';
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
import {SakaiConstants} from '@shared/constants/sakai.constants';
import {BusyService} from '../../services/busy.service';
import {forkJoin, Observable, tap, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  readonly isAssignmentName: boolean = true;

  readonly noRubricDefaultValue: boolean = false;

  isFileLoaded = false;

  importForm: FormGroup;

  isRubric = true;

  isModalOpened = false;

  isValidFormat: boolean;

  rubrics: IRubricName[];

  workspaces: string[] = [];

  selected: string;

  private actualFilePath: string;
  assignmentTypes = [
    {'name': 'Assignment'},
    {'name': 'Generic'}];
  selectedType: string;

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
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required]
    });
  }

  async selectFile() {
    this.busyService.start();
    this.appService.getFile({ name: 'Zip Files', extension: ['zip'] })
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        this.busyService.stop();
        if (appSelectedPathInfo.selectedPath) {
          this.busyService.start();
          this.actualFilePath = appSelectedPathInfo.selectedPath;
        }

        this.onFileChange(appSelectedPathInfo);
        if (appSelectedPathInfo.error) {
          this.alertService.error(appSelectedPathInfo.error.message);
        }
      });
  }

  onFileChange(appSelectedPathInfo: AppSelectedPathInfo) {

    this.fc.assignmentZipFileText.setValue((appSelectedPathInfo) ? appSelectedPathInfo.basename : '');
    this.fc.assignmentName.setValue(appSelectedPathInfo ? ImportComponent.getAssignmentNameFromFilename(appSelectedPathInfo.fileName) : '');

    this.selectedType = this.fc.assignmentType.value;
    if (this.selectedType === 'Assignment') {
      // Is zip, then checks structure.
      this.importService.isValidSakaiZip(appSelectedPathInfo.selectedPath).subscribe({
        next: (isValidFormat: boolean) => {
          this.isValidFormat = isValidFormat;
          if (!this.isValidFormat) {
            this.alertService.error(SakaiConstants.formatErrorMessage);
          } else {
            this.clearError();
          }
          this.isFileLoaded = true;
          this.busyService.stop();
        }, error: (error) => {
          this.showErrorMessage(error);
          this.busyService.stop();
        }
      });
    } else  if (this.selectedType === 'Generic') {
      this.isValidFormat = true;
      this.isFileLoaded = true;
      this.busyService.stop();
    }  else {
      this.busyService.stop();
    }
  }


  get fc() {
    return this.importForm.controls;
  }

  onRubricChange() {
    if (this.fc.noRubric.value) {
      this.fc.rubric.setValidators(null);
      this.fc.rubric.updateValueAndValidity();
      this.fc.rubric.disable();
      this.isRubric = false;
    } else {
      this.fc.rubric.setValidators(Validators.required);
      this.fc.rubric.updateValueAndValidity();
      this.fc.rubric.enable();
    }
    this.importForm.updateValueAndValidity();
  }

  onAssignmentTypeChange() {
    this.selectedType = this.fc.assignmentType.value;
    this.fc.assignmentType.updateValueAndValidity();
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
    this.clearError();
    if (this.importForm.invalid || !this.isValidFormat) {
      this.showErrorMessage('Please fill in the correct details!');
      return;
    }

    const {
      assignmentName,
      noRubric,
      rubric,
      workspaceFolder
    } = this.importForm.value;

    const importData: ImportInfo = {
      file: this.actualFilePath,
      workspace: workspaceFolder,
      noRubric: noRubric,
      rubricName: rubric,
      assignmentName: assignmentName,
      assignmentType: this.selectedType
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


  private showErrorMessage(errorMessage: string) {
    this.alertService.error(errorMessage);
  }

  private clearError() {
    this.alertService.clear();
  }

  private resetForm() {
    this.importForm.reset();
    this.isFileLoaded = false;
    this.isRubric = true;
    this.isModalOpened = false;
    this.isValidFormat = false;
    this.selectedType = undefined;
    this.fc.noRubric.setValue(this.noRubricDefaultValue);
    this.fc.rubric.enable();
    this.initForm();
    this.assignmentService.refreshWorkspaces().subscribe();
  }
}
