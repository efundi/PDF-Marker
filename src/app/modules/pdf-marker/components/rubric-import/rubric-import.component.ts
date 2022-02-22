import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {AlertService} from '@coreModule/services/alert.service';
import {AppService} from '@coreModule/services/app.service';
import {Mapping} from '@coreModule/utils/mapping.class';
import {ImportService} from '@pdfMarkerModule/services/import.service';
import {MimeTypesEnum} from '@coreModule/utils/mime.types.enum';
import {YesAndNoConfirmationDialogComponent} from '@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {RubricViewModalComponent} from '@sharedModule/components/rubric-view-modal/rubric-view-modal.component';
import {ElectronService} from '@coreModule/services/electron.service';
import {AppSelectedPathInfo} from '@coreModule/info-objects/app-selected-path.info';
import {Subscription} from 'rxjs';
import {IRubric, IRubricName, SelectedRubric} from "../../../../../shared/info-objects/rubric.class";
import {RubricService} from "@sharedModule/services/rubric.service";

@Component({
  selector: 'pdf-marker-rubric-import',
  templateUrl: './rubric-import.component.html',
  styleUrls: ['./rubric-import.component.scss']
})
export class RubricImportComponent implements OnInit, OnDestroy {

  readonly displayedColumns: string[] = ['title', 'actions', 'inUse'];
  private selectedRubric: SelectedRubric;
  readonly rubricTemplateFile: string = 'Rubric_template.xlsx';

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
              private electronService: ElectronService,
              private rubricService: RubricService) {
  }

  ngOnInit() {
    this.appService.isLoading$.next(true);
    this.rubricService.getRubricNames().subscribe((rubrics: IRubric[]) => {
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


  async selectFile() {
    this.alertService.clear();
    this.rubricService.selectRubricFile()
      .subscribe({
        next: (selectedRubric) => {
          this.selectedRubric = selectedRubric;
          this.fc.rubricFile.setErrors(null);
          this.fc.rubricFileText.setValue(selectedRubric.selectedPath);
          this.fc.rubricName.setValue(selectedRubric.rubric.name);
          this.appService.isLoading$.next(false);
        }, error: (error) => {
          this.selectedRubric = null;
          this.appService.isLoading$.next(false);
          if (error) {
            this.alertService.error(error);
            this.fc.rubricFile.setErrors({file: true});
            this.fc.rubricName.setValue(null);
          }
        }
      });
  }


  showRubric(rubricName: string) {
    this.openRubricModal(rubricName);
  }

  openExternalResource() {
    this.appService.isLoading$.next(true);
    this.electronService.openExternalLink(this.rubricTemplateFile).subscribe(() => {
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, 'Unable to open resource link');
      this.appService.isLoading$.next(false);
    });
  }

  downloadFile() {
    this.alertService.clear();
    this.appService.isLoading$.next(true);
    fetch('assets/' + this.rubricTemplateFile)
      .then(response => {
        response.blob().then(async (blob: Blob) => {
          const reader = new FileReader();
          reader.addEventListener('loadend', () => {
            this.electronService.saveFile({
              filename: this.rubricTemplateFile,
              buffer: reader.result,
              name: 'Excel File',
              extension: ["xlsx"]})
              .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
                this.appService.isLoading$.next(false);
                if (appSelectedPathInfo.selectedPath) {
                  this.alertService.success(`File saved to downloads folder`);
                } else if (appSelectedPathInfo.error) {
                  this.appService.openSnackBar(false, appSelectedPathInfo.error.message);
                }
              });
            this.appService.isLoading$.next(false);
          });

          reader.readAsArrayBuffer(blob);
        }).catch(error => {
          this.alertService.error(error.message);
          this.appService.isLoading$.next(false);
        });
      })
      .catch(error => {
        this.alertService.error(error.message);
        this.appService.isLoading$.next(false);
      });
  }

  deleteRubric(item: IRubric) {
    this.appService.isLoading$.next(true);
    this.rubricService.deleteRubricCheck(item.name).subscribe((isFound: boolean) => {
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
            this.deleteRubricImpl(item.name);
          }
        };

        this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);
      } else {
        this.deleteRubricImpl(item.name);
      }
    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete');
      this.appService.isLoading$.next(false);
    });
  }

  private deleteRubricImpl(rubricName: string) {
    this.rubricService.deleteRubric(rubricName).subscribe((rubrics: IRubric[]) => {
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

  onSubmit(event) {
    this.alertService.clear();
    if (this.rubricForm.invalid) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }

    const rubric: IRubric = {
      ...this.selectedRubric.rubric,
      name: this.fc.rubricName.value
    };
    this.appService.isLoading$.next(true);
    this.rubricService.uploadRubric(rubric).subscribe((rubrics: IRubricName[]) => {
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
    this.rubricService.getRubric(rubricName).subscribe((rubric: IRubric) => {
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
