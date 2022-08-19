import {Component, OnDestroy, OnInit, ViewContainerRef} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {AlertService} from '../../services/alert.service';
import {AppService} from '../../services/app.service';
import {ImportService} from '../../services/import.service';
import {
  ConfirmationDialogComponent
} from '../confirmation-dialog/confirmation-dialog.component';
import {RubricViewModalComponent} from '../rubric-view-modal/rubric-view-modal.component';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {Subscription} from 'rxjs';
import {IRubric, IRubricName, SelectedRubric} from '@shared/info-objects/rubric.class';
import {RubricService} from '../../services/rubric.service';
import {BusyService} from '../../services/busy.service';

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

  rubricForm: UntypedFormGroup;
  dataSource: MatTableDataSource<IRubricName>;
  rubrics: IRubricName[];

  subscription: Subscription;

  constructor(private fb: UntypedFormBuilder,
              private alertService: AlertService,
              private appService: AppService,
              private importService: ImportService,
              private busyService: BusyService,
              private rubricService: RubricService,
              private viewContainerRef: ViewContainerRef) {

    this.initForm();
  }

  ngOnInit() {
    this.busyService.start();
    this.rubricService.getRubricNames().subscribe({
      next: (rubrics: IRubric[]) => {
        this.populateRubrics(rubrics);
        this.busyService.stop();
      }, error: () => {
        this.appService.openSnackBar(false, 'Unable to retrieve rubrics');
        this.busyService.stop();
      }
    });
  }

  private initForm() {
    this.rubricForm = this.fb.group({
      rubricName: [null, Validators.required],
      rubricFile: [null, Validators.required],
      rubricFileText: [null, Validators.required]
    });
  }

  get fc() {
    return this.rubricForm.controls;
  }


  selectFile() {
    this.alertService.clear();
    this.busyService.start();
    this.rubricService.selectRubricFile()
      .subscribe({
        next: (selectedRubric) => {
          this.selectedRubric = selectedRubric;
          this.fc.rubricFile.setErrors(null);
          this.fc.rubricFileText.setValue(selectedRubric.selectedPath);
          this.fc.rubricName.setValue(selectedRubric.rubric.name);
          this.busyService.stop();
        }, error: (error) => {
          this.selectedRubric = null;
          this.busyService.stop();
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

  downloadFile() {
    this.alertService.clear();
    this.busyService.start();
    fetch('assets/' + this.rubricTemplateFile)
      .then(response => {
        response.blob().then(async (blob: Blob) => {
          const reader = new FileReader();
          reader.addEventListener('loadend', () => {
            this.appService.saveFile({
              filename: this.rubricTemplateFile,
              buffer: reader.result,
              name: 'Excel File',
              extension: ['xlsx']})
              .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
                this.busyService.stop();
                if (appSelectedPathInfo.selectedPath) {
                  this.alertService.success(`Rubric template file downloaded`);
                } else if (appSelectedPathInfo.error) {
                  this.appService.openSnackBar(false, appSelectedPathInfo.error.message);
                }
              });
          });

          reader.readAsArrayBuffer(blob);
        }).catch(error => {
          this.alertService.error(error.message);
          this.busyService.stop();
        });
      })
      .catch(error => {
        this.alertService.error(error.message);
        this.busyService.stop();
      });
  }

  deleteRubric(item: IRubric) {
    this.busyService.start();
    this.rubricService.deleteRubricCheck(item.name).subscribe({
      next: (inUse: boolean) => {
        this.busyService.stop();
        if (inUse) {
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

          this.appService.createDialog(ConfirmationDialogComponent, config, shouldDeleteFn);
        } else {
          this.deleteRubricImpl(item.name);
        }
      },
      error: () => {
        this.appService.openSnackBar(false, 'Unable to delete');
        this.busyService.stop();
      }
    });
  }

  private deleteRubricImpl(rubricName: string) {
    this.busyService.start();
    this.rubricService.deleteRubric(rubricName).subscribe({
      next: (rubrics: IRubric[]) => {
        this.populateRubrics(rubrics);
        this.busyService.stop();
        this.appService.openSnackBar(true, 'Rubric deleted');
      },
      error: () => {
        this.appService.openSnackBar(false, 'Unable to delete');
        this.busyService.stop();
      }
    });
  }

  private resetPreviousUpload() {
    this.rubricForm.reset();
    this.rubricForm.updateValueAndValidity();
  }

  onResetPreviousUpload() {
    this.resetPreviousUpload();
  }

  onSubmit() {
    this.alertService.clear();
    if (this.rubricForm.invalid) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }

    const rubric: IRubric = {
      ...this.selectedRubric.rubric,
      name: this.fc.rubricName.value
    };
    this.busyService.start();
    this.rubricService.uploadRubric(rubric).subscribe({
      next: (rubrics: IRubricName[]) => {
        this.populateRubrics(rubrics);
        this.busyService.stop();
        this.appService.openSnackBar(true, 'Rubric saved');
        this.resetPreviousUpload();
      },
      error: () => {
        this.appService.openSnackBar(false, 'Unable to save');
        this.busyService.stop();
      }
    });
  }

  private populateRubrics(rubrics: IRubricName[]) {
    this.rubrics = rubrics;
    this.dataSource = new MatTableDataSource<IRubricName>(this.rubrics);
  }

  private openRubricModal(rubricName: string) {
    this.rubricService.getRubric(rubricName).subscribe({
      next: (rubric: IRubric) => {
        this.openRubricModalDialog(rubric);
        this.appService.openSnackBar(true, 'Rubric View Opened');
      },
      error: () => {
        this.appService.openSnackBar(false, 'Rubric View Failed');
      }
    });
  }

  private openRubricModalDialog(rubric: IRubric) {
    const config = new MatDialogConfig();
    config.disableClose = false;
    config.viewContainerRef = this.viewContainerRef;
    config.width = '1500px';
    config.data = {
      rubric
    };

    this.appService.createDialog(RubricViewModalComponent, config);
  }

  ngOnDestroy(): void {
  }


}
