import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {AlertService} from '@coreModule/services/alert.service';
import {AppService} from '@coreModule/services/app.service';
import {Mapping} from '@coreModule/utils/mapping.class';
import {
  IRubric,
  IRubricCriteria,
  IRubricCriteriaLevels,
  IRubricName,
  Rubric,
  RubricCriteria,
  RubricCriteriaLevels
} from '@coreModule/utils/rubric.class';
import {ImportService} from '@pdfMarkerModule/services/import.service';
import {MimeTypesEnum} from '@coreModule/utils/mime.types.enum';
import {YesAndNoConfirmationDialogComponent} from '@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {RubricViewModalComponent} from '@sharedModule/components/rubric-view-modal/rubric-view-modal.component';
import {ElectronService} from '@coreModule/services/electron.service';
import {AppSelectedPathInfo} from '@coreModule/info-objects/app-selected-path.info';
import {Subscription} from 'rxjs';

@Component({
  selector: 'pdf-marker-rubric-import',
  templateUrl: './rubric-import.component.html',
  styleUrls: ['./rubric-import.component.scss']
})
export class RubricImportComponent implements OnInit, OnDestroy {

  readonly displayedColumns: string[] = ['title', 'actions', 'inUse'];
  private file: File;
  private fileContents: IRubric;
  readonly externalLink: string = 'https://rubric.nwu.ac.za';

  config: MatDialogConfig;

  rubricForm: FormGroup;
  dataSource: MatTableDataSource<IRubricName>;
  rubrics: IRubricName[];

  subscription: Subscription;

  readonly MimeTypesEnum = MimeTypesEnum;

  constructor(private fb: FormBuilder,
              private alertService: AlertService,
              private appService: AppService,
              private importService: ImportService,
              private electronService: ElectronService) {
  }

  ngOnInit() {
    this.appService.isLoading$.next(true);
    this.importService.getRubricDetails().subscribe((rubrics: IRubric[]) => {
      this.populateRubrics(rubrics);
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, 'Unable to retrieve rubrics');
      this.appService.isLoading$.next(false);
    });
    this.init();
  }

  private init() {
    this.rubricForm = this.fb.group({
      rubricName: [null, Validators.required],
      rubricFile: [null, Validators.required],
      rubricFileText: [null, Validators.required]
    });
  }

  get fc() {
    return this.rubricForm.controls;
  }

  async onFileChange() {
    this.alertService.clear();
    this.resetPreviousUpload();
    if (this.file !== undefined && this.file !== null) {
      this.validateRubricJSON();
    } else {
      this.fc.rubricFile.setValue(null);
      this.fc.rubricFileText.setValue(null);
    }
  }

  async selectFile() {
    this.alertService.clear();
    this.electronService.getExcelToJSONOb().subscribe(async (appSelectedPathInfo: AppSelectedPathInfo) => {
      this.appService.isLoading$.next(true);
      if (appSelectedPathInfo && appSelectedPathInfo.selectedPath && appSelectedPathInfo.contents) {
        const pathSplit = appSelectedPathInfo.selectedPath.split('\\');

        try {
          const rubric: IRubric = this.validateRubricContents(JSON.parse(appSelectedPathInfo.contents));
          if (rubric) {
            const blob: Blob = new Blob([JSON.stringify(rubric)], {type: MimeTypesEnum.JSON});
            this.file = await new File(
              [blob], pathSplit[pathSplit.length - 1], {type: MimeTypesEnum.JSON}
            );
            this.onFileChange();
          } else {
            this.appService.isLoading$.next(false);
          }
        } catch (e) {
          this.appService.isLoading$.next(false);
          this.alertService.error(e);
        }

        /*// Validate Returned Json
        const rubric: IRubric = this.validateRubricContents(appSelectedPathInfo.contents);
        try {
          const blob: Blob = new Blob([appSelectedPathInfo.contents], { type: MimeTypesEnum.JSON });
          this.file = await new File(
            [blob], pathSplit[pathSplit.length - 1], { type: MimeTypesEnum.JSON }
          );
        } catch (e) {
          this.setErrorMessage(this.file, 'Could not convert Excel file to JSON!');
          this.appService.isLoading$.next(false);
        }
        this.onFileChange();
      } else {
        this.appService.isLoading$.next(false);
        this.file = undefined;
        this.onFileChange();
      } */
      }
    });
    this.electronService.getExcelToJSON({ name: 'Custom Files', extension: ['xlsx'] });
  }

  private validateRubricJSON() {
    const reader = new FileReader();

    reader.addEventListener('loadend', (e) => {

      try {
        const json: IRubric = JSON.parse(reader.result.toString()) as IRubric;

        if (Mapping.isTypeOf(json, Rubric)) {
          let isError: boolean;
          for (let i = 0; i < json.criterias.length; i++) {
            if (!Mapping.isTypeOf(json.criterias[i], RubricCriteria) || !Mapping.isCollectionTypeOf(json.criterias[i].levels, RubricCriteriaLevels)) {
              isError = true;
              break;
            }
          }

          if (!isError) {
            this.fc.rubricFile.setErrors(null);
            this.fc.rubricFileText.setValue(this.file.name);
            this.fc.rubricName.setValue(this.getRubricNameFromFilename(this.file.name));
            this.fileContents = json;
          } else {
            this.setErrorMessage(this.file, 'Invalid rubric!');
          }
          this.appService.isLoading$.next(false);
        } else {
          this.setErrorMessage(this.file, 'Invalid rubric criteria!');
          this.appService.isLoading$.next(false);
        }
      } catch (e) {
        this.setErrorMessage(this.file, 'Cannot convert provided file to valid JSON!');
        this.appService.isLoading$.next(false);
      }
    });

    reader.readAsText(this.file);
  }

  private validateRubricContents(rubric: IRubric): IRubric {
    const newCriterias: IRubricCriteria[] = [];
    let rowCount = 4;
    let errorMessage: string;
    let errorFound: boolean;
    let validLevelLength = 0;
    const startMessagePrefix = `Error[row = `;
    const startMessageSuffix = `]: achievement_level`;
    const notProvided = `is not provided`;

    for (let index = 0; index < rubric.criterias.length; index++) {

      const newCriteria: IRubricCriteria = {
        name: null,
        description: null,
        levels: []
      };


      errorMessage = '';
      errorFound = false;

      if (this.isBlank(rubric.criterias[index].name)) {
        errorMessage = this.joinError(errorMessage, `Criteria name ${notProvided}`);
        errorFound = true;
      }

      if (this.isBlank(rubric.criterias[index].description)) {
        errorMessage = this.joinError(errorMessage, `Criteria description ${notProvided}`);
        errorFound = true;
      }

      if (errorFound) {
        this.alertService.error(errorMessage);
        return null;
      }

      newCriteria.name = rubric.criterias[index].name.trim();
      newCriteria.description = rubric.criterias[index].description.trim();

      for (let i = 0; i < ((validLevelLength === 0) ? rubric.criterias[index].levels.length : validLevelLength); i++) {

        const level: IRubricCriteriaLevels = rubric.criterias[index].levels[i];
        if (this.isBlank(level.score)) {
          errorMessage = this.joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}_score ${notProvided}`);
          errorFound = true;
        }


        if (isNaN(level.score)) {
          errorMessage = this.joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}_score is not a valid number`);
          errorFound = true;
        }

        level.score = parseInt('' + level.score, 10);

        if (this.isBlank(level.label)) {
          errorMessage = this.joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}_title ${notProvided}`);
          errorFound = true;
        }

        if (this.isBlank(level.description)) {
          errorMessage = this.joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}_feedback ${notProvided}`);
          errorFound = true;
        }

        if (errorFound && i === 0) {
          this.alertService.error(errorMessage);
          return null;
        } else if (errorFound && i > 0) {
          break;
        } else if (rowCount === 4 && (i === rubric.criterias[index].levels.length - 1)) {
          validLevelLength = rubric.criterias[index].levels.length;
        }

        newCriteria.levels.push({
          score: level.score,
          label: level.label,
          description: level.description
        });
      }

      if (rowCount !== 4 && newCriteria.levels.length !== validLevelLength) {
        errorMessage = this.joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix} do not match first row achievement levels`);
        this.alertService.error(errorMessage);
        return null;
      }

      newCriterias.push(newCriteria);
      rowCount++;
    }

    if (newCriterias.length === 0) {
      this.alertService.error(this.joinError(errorMessage, `No criterias have been set!`));
      return null;
    }

    rubric = { criterias: newCriterias };
    return rubric;
  }

  private setErrorMessage(file: File, errorMsg: string) {
    this.alertService.error(errorMsg);
    this.fc.rubricFile.setErrors({file: true});
    this.fc.rubricFileText.setValue(file.name);
    this.fc.rubricName.setValue(null);
  }

  private joinError(currentMessage: string, newMessage: string): string {
    currentMessage += (!this.isBlank(currentMessage)) ? `, ${newMessage}` : newMessage;
    return currentMessage;
  }

  showRubric(rubricName: string) {
    this.openRubricModal(rubricName);
  }

  openExternalResource() {
    this.appService.isLoading$.next(true);
    this.electronService.openExternalLink(this.externalLink);
    this.electronService.getObservable().subscribe(() => {
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, 'Unable to open resource link');
      this.appService.isLoading$.next(false);
    });
  }

  deleteRubric(rubricName: string) {
    const data = {rubricName};
    this.appService.isLoading$.next(true);
    this.importService.deleteRubricCheck(data).subscribe((isFound: boolean) => {
      if (isFound) {
        const config = new MatDialogConfig();
        config.width = '400px';
        config.maxWidth = '400px';
        config.data = {
          title: 'Confirmation',
          message: 'This rubric is in use, are your sure you want to delete it?'
        };
        const shouldDeleteFn = (shouldDelete: boolean) => {
          if (shouldDelete) {
            this.deleteRubricImpl(rubricName, shouldDelete);
          }
        };

        this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);
      } else {
        this.deleteRubricImpl(rubricName, true);
      }
    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete');
      this.appService.isLoading$.next(false);
    });
  }

  private deleteRubricImpl(rubricName: string, confirmation: boolean) {
    const newData = { rubricName, confirmation};
    this.importService.deleteRubric(newData).subscribe((rubrics: IRubric[]) => {
      this.populateRubrics(rubrics);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Rubric deleted');
    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete');
      this.appService.isLoading$.next(false);
    });
  }

  private resetPreviousUpload() {
    this.rubricForm.reset();
    this.rubricForm.updateValueAndValidity();
  }

  onResetPreviousUpload() {
    this.resetPreviousUpload();
  }

  private getRubricNameFromFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }

  onSubmit(event) {
    this.alertService.clear();
    if (this.rubricForm.invalid) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }

    const formData: FormData = new FormData();
    formData.append('rubricName', this.fc.rubricName.value);
    formData.append('file', this.file);

    this.appService.isLoading$.next(true);
    this.importService.importRubricFile(formData).subscribe((rubrics: IRubricName[]) => {
      this.populateRubrics(rubrics);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Rubric saved');
      this.resetPreviousUpload();
    }, error => {
      this.appService.openSnackBar(false, 'Unable to save');
      this.appService.isLoading$.next(false);
    });
  }

  private populateRubrics(rubrics: IRubricName[]) {
    this.rubrics = rubrics;
    this.dataSource = new MatTableDataSource<IRubricName>(this.rubrics);
  }

  private openRubricModal(rubricName: string) {
    const data = {rubricName};
    this.importService.getRubricContents(data).subscribe((rubric: IRubric) => {
      this.openRubricModalDialog(rubric);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Rubric View Opened');
    }, error => {
      this.appService.openSnackBar(false, 'Rubric View Failed');
      this.appService.isLoading$.next(false);
    });
  }

  private openRubricModalDialog(rubric: IRubric) {
    const config = new MatDialogConfig();
    config.disableClose = false;
    config.width = '1500px';
    config.height = '750px';
    config.data = {
      rubric
    };

    this.appService.createDialog(RubricViewModalComponent, config);
  }

  private isBlank(data) {
    return (data === '' || data === null || data === undefined);
  }

  ngOnDestroy(): void {
  }


}
