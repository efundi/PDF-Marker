import {Component, Inject, OnInit} from '@angular/core';
import {
  AsyncValidatorFn,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {SettingsService} from '../../../services/settings.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {Marker, SettingInfo} from '@shared/info-objects/setting.info';
import {find, isNil, reduce, values} from 'lodash';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {BusyService} from '../../../services/busy.service';
import {AppService} from '../../../services/app.service';
import {AlertService} from '../../../services/alert.service';
import {ImportService} from '../../../services/import.service';

@Component({
  selector: 'pdf-marker-import-marker-modal',
  templateUrl: './import-marker-modal.component.html',
  styleUrls: ['./import-marker-modal.component.scss']
})
export class ImportMarkerModalComponent implements OnInit {

  settings: SettingInfo;
  assignmentSettings: AssignmentSettingsInfo;
  markers: Marker[] = [];
  formGroup: FormGroup<{
    markerId: FormControl<string>,
    zipFile: FormControl<string>,
  }>;

  constructor(private formBuilder: FormBuilder,
              private settingsService: SettingsService,
              private appService: AppService,
              private busyService: BusyService,
              private alertService: AlertService,
              private importService: ImportService,
              private dialogRef: MatDialogRef<ImportMarkerModalComponent>,
              @Inject(MAT_DIALOG_DATA) private data: any) {
    this.initForm();
  }

  private initForm() {
    this.formGroup = this.formBuilder.group({
      markerId: [null as string, Validators.required],
      zipFile: [null as string, Validators.required],
    }, {asyncValidators: this.formValidateImportFile()});
  }

  /**
   * Creates a form validatorFn that can validate unique email
   * @param existingId
   * @private
   */
  private formValidateImportFile(): AsyncValidatorFn {
    return (ac: FormGroup<{
      markerId: FormControl<string>,
      zipFile: FormControl<string>}>): Observable<ValidationErrors> => {
      const filename = ac.value.zipFile;
      const markerId = ac.value.markerId;
      if (isNil(filename) || isNil(markerId)) {
        // Can't validate without both
        return of(null);
      }

      return this.validateImportFile(filename, markerId).pipe(
        catchError(error => of(error)),
        map((error) => {
          if (error) {
            return {invalidZip: error};
          } else {
            return null;
          }
        })
      );
    };
  }

  private validateImportFile(filename: string, markerId: string): Observable<ValidationErrors> {
      return this.importService.validateLectureImport({
        markerId,
        filename,
        assignmentName: this.data.assignmentName,
        workspaceName: this.data.workspaceName
      });
  }

  ngOnInit(): void {
    this.assignmentSettings = this.data.assignmentSettings;
    this.settings = this.data.settings;


    const markersMap = reduce(this.assignmentSettings.submissions, (total, submission) => {
      const markerId = submission.allocation.id;
      if (markerId === this.settings.user.id) {
        // Don't add self to the list
        return total;
      }

      if (!total.hasOwnProperty(markerId)) {
        total[markerId] = find(this.settings.markers, {id: markerId});
      }

      return total;
    }, {});

    this.markers = values(markersMap);

  }


  onClose() {
    this.dialogRef.close();
  }

  submit() {
    this.dialogRef.close();
  }

  selectFile() {
    this.busyService.start();
    this.appService.getFile({ name: 'Zip Files', extension: ['zip'] })
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        this.busyService.stop();
        if (appSelectedPathInfo.selectedPath) {
          this.formGroup.patchValue({
            zipFile: appSelectedPathInfo.selectedPath
          });
        }
        if (appSelectedPathInfo.error) {
          this.alertService.error(appSelectedPathInfo.error.message);
        }
      });
  }
}
