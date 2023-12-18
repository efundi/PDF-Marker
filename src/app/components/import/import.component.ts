import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {FileExplorerModalComponent} from '../file-explorer-modal/file-explorer-modal.component';
import {AlertService} from '../../services/alert.service';
import {AppService} from '../../services/app.service';
import {ImportService} from '../../services/import.service';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {WorkspaceService} from '../../services/workspace.service';
import {IRubricName} from '@shared/info-objects/rubric.class';
import {RubricService} from '../../services/rubric.service';
import {ImportInfo} from '@shared/info-objects/import.info';
import {BusyService} from '../../services/busy.service';
import {forkJoin, Observable, Subscription, tap, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';
import {isNil} from 'lodash';
import {AssignmentImportValidateResultInfo} from '@shared/info-objects/assignment-import-validate-result.info';
import {RoutesEnum} from '../../utils/routes.enum';
import {Router} from '@angular/router';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {DistributionFormat, getSourceFormatDescription} from "@shared/info-objects/assignment-settings.info";

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit, OnDestroy {

  readonly isAssignmentName: boolean = true;

  isFileLoaded = false;

  importForm: FormGroup<{
    assignmentZipFileText: FormControl<string>,
    assignmentName: FormControl<string>,
    workspaceFolder: FormControl<string>,
    rubric: FormControl<string>
  }>;

  private formSubscriptions: Subscription[] = [];

  isValidFormat: boolean;

  rubrics: IRubricName[];

  workspaces: string[] = [];

  selected: string;

  private actualFilePath: string;
  assignmentValidateResultInfo: AssignmentImportValidateResultInfo;

  /**
   * Description of the source type that is imported
   */
  sourceFormatDescription = '';

  private static getAssignmentNameFromFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }

  constructor(private fb: FormBuilder,
              private dialog: MatDialog,
              private router: Router,

              private alertService: AlertService,
              private appService: AppService,
              private importService: ImportService,
              private rubricService: RubricService,
              private busyService: BusyService,
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
            this.workspaces = workspaces;
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
      assignmentZipFileText: [null as string],
      assignmentName: [null as string],
      workspaceFolder: [null as string, Validators.required],
      rubric: ['']
    });

  }

  selectFile() {
    this.busyService.start();
    this.appService.getFile({
      filters: [{
        name: 'Zip Files',
        extensions: ['zip']
      }]
    }).subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
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
    this.validateZipFile(this.actualFilePath);
  }

  private validateZipFile(file: string): void {
    if (isNil(file)) {
      // Can't validate without these
      this.assignmentValidateResultInfo = null;
      return;
    }

    this.busyService.start();
    this.alertService.clear();
    this.importService.validateZipFile(file).subscribe({
      next: (assignmentValidateResultInfo) => {
        this.assignmentValidateResultInfo = assignmentValidateResultInfo;
        this.sourceFormatDescription = getSourceFormatDescription(assignmentValidateResultInfo.sourceFormat)
        if (assignmentValidateResultInfo.distributionFormat === DistributionFormat.DISTRIBUTED) {
          this.importForm.controls.rubric.disable();
        } else {
          this.importForm.controls.rubric.enable();
        }
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


  onPreview() {
    this.busyService.start();
    this.importService.getZipEntries(this.actualFilePath)
      .subscribe((treeNodes) => {

        this.busyService.stop();
        const config = new MatDialogConfig();
        config.data = {
          treeNodes,
          filename: treeNodes[0].name
        };

        this.appService.createDialog(FileExplorerModalComponent, config);
      });
  }

  onSubmit() {
    this.alertService.clear();
    if (this.importForm.invalid || !this.isValidFormat) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }

    const formValue = this.importForm.getRawValue();
    const importData: ImportInfo = {
      file: this.actualFilePath,
      workspace: formValue.workspaceFolder,
      rubricName: formValue.rubric === '' ? null : formValue.rubric,
      assignmentName: formValue.assignmentName,
      sourceFormat: this.assignmentValidateResultInfo.sourceFormat,
      distributionFormat: this.assignmentValidateResultInfo.distributionFormat
    };
    this.busyService.start();
    this.importService.importAssignmentFile(importData).subscribe({
      next: (assignmentDirectory) => {
        this.busyService.stop();
        this.alertService.success('Successfully extracted assignment to selected workspace!');
        if (PdfmUtilsService.isDefaultWorkspace(importData.workspace)) {
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, assignmentDirectory]);
        } else {
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, assignmentDirectory, importData.workspace]);
        }

      },
      error: (error) => {
        this.alertService.error(error);
        this.busyService.stop();
      }
    });
  }
}
