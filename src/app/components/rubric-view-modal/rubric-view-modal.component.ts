import {Component, Inject, Input, OnDestroy, OnInit} from '@angular/core';
import {AppService} from '../../services/app.service';
import {MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef} from '@angular/material/dialog';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import {SettingsService} from '../../services/settings.service';
import {ImportService} from '../../services/import.service';
import {Subscription} from 'rxjs';
import {AssignmentService} from '../../services/assignment.service';
import {
  ConfirmationDialogComponent
} from '../confirmation-dialog/confirmation-dialog.component';
import {IRubric, IRubricName} from '@shared/info-objects/rubric.class';
import {RubricService} from '../../services/rubric.service';
import {BusyService} from '../../services/busy.service';
import {map} from 'lodash';
import {calculateCanManageRubric} from '../../utils/utils';


@Component({
  selector: 'pdf-marker-rubric-view-modal',
  templateUrl: './rubric-view-modal.component.html',
  styleUrls: ['./rubric-view-modal.component.scss'],
})
export class RubricViewModalComponent implements OnInit, OnDestroy {

  rubricName: string;

  /**
   * The original rubric given to this modal
   * @private
   */
  private originalRubric: IRubric;

  currentRubric: IRubric;

  private formSubscription: Subscription;
  @Input()
  assignmentSettingsInfo: AssignmentSettingsInfo;
  rubricForm: UntypedFormGroup;
  rubricsNames: string[] = [];
  private assignmentName = 'No Assignment';
  canEdit: boolean;
  constructor(private appService: AppService,
              private dialogRef: MatDialogRef<RubricViewModalComponent>,
              private settingsService: SettingsService,
              private importService: ImportService,
              private rubricService: RubricService,
              private fb: UntypedFormBuilder,
              private assignmentService: AssignmentService,
              private busyService: BusyService,
              @Inject(MAT_DIALOG_DATA)  private config) {

    if (config != null) {
      if (config.assignmentSettingsInfo != null) {
        this.assignmentSettingsInfo = config.assignmentSettingsInfo;
        this.originalRubric = config.assignmentSettingsInfo.rubric;
        this.currentRubric = config.assignmentSettingsInfo.rubric;
        this.assignmentName = config.assignmentName;
        this.canEdit = calculateCanManageRubric(this.assignmentSettingsInfo);


      } else {
        if (config.rubric != null) {
          this.originalRubric = config.rubric;
          this.currentRubric = config.rubric;
        }
      }
    }
    this.initForm();
  }


  ngOnDestroy() {
    this.formSubscription.unsubscribe();
  }

  ngOnInit() {

    this.formSubscription = this.rubricForm.controls['rubricName'].valueChanges.subscribe(rubricName => this.onRubricChange(rubricName));

    if (this.canEdit) {

      this.rubricService.getRubricNames().subscribe((rubrics: IRubricName[]) => {
        this.rubricsNames = map(rubrics, 'name');
        this.rubricForm.reset({
          rubricName: this.assignmentSettingsInfo.rubric.name
        }, {emitEvent: false});
      });
    }

  }

  private initForm() {
    this.rubricForm = this.fb.group({
      rubricName: [null]
    });
  }

  onClose() {
    this.dialogRef.close();
  }

  private onRubricChange(rubricName: string) {
    this.rubricService.getRubric(rubricName).subscribe((rubric: IRubric) => {
      this.currentRubric = rubric;
    });
  }

  saveRubricChangeClick() {
    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '400px';
    config.data = {
      title: 'Confirmation',
      message: 'Changing or attaching a rubric to an assignment will erase previously marked assignment submission, do you wish to continue?',
    };
    const shouldChangeRubricFn = (shouldChangeRubric: boolean) => {
      if (shouldChangeRubric) {
        this.saveRubricChange();
      }
    };

    this.appService.createDialog(ConfirmationDialogComponent, config, shouldChangeRubricFn);
  }

  saveRubricChange() {

    this.busyService.start();
    this.assignmentService.updateAssignmentRubric(
      this.config.workspaceName,
      this.assignmentName,
      this.rubricForm.value.rubricName)
      .subscribe({
        next: () => {
          this.appService.openSnackBar(true, 'Successfully updated rubric');
          this.busyService.stop();
          this.dialogRef.close();
        },
        error: (error) => {
          console.log(error);
          this.busyService.stop();
          this.appService.openSnackBar(false, 'Unable to update rubric');
          this.dialogRef.close();
        }
      });
  }

  onCancel() {
    this.dialogRef.close();
  }

}
