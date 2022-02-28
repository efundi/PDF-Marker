import {Component, ElementRef, Inject, Input, OnInit, ViewChild} from '@angular/core';
import {AppService} from '../../services/app.service';
import {MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef} from '@angular/material/dialog';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {FormBuilder, FormGroup} from '@angular/forms';
import {SettingsService} from '../../services/settings.service';
import {ImportService} from '../../services/import.service';
import {Subscription} from 'rxjs';
import {AssignmentService} from '../../services/assignment.service';
import {
  YesAndNoConfirmationDialogComponent
} from '../yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {IRubric, IRubricName} from '@shared/info-objects/rubric.class';
import {RubricService} from '../../services/rubric.service';
import {BusyService} from "../../services/busy.service";


@Component({
  selector: 'pdf-marker-rubric-view-modal',
  templateUrl: './rubric-view-modal.component.html',
  styleUrls: ['./rubric-view-modal.component.scss'],
})
export class RubricViewModalComponent implements OnInit {

  rubricName: string;
  @Input() rubricMarking: IRubric;
  rubricMarkingSub: Subscription;
  @Input() assignmentSettingsInfo: AssignmentSettingsInfo;
  rubricForm: FormGroup;
  rubrics: IRubricName[] = [];
  private previouslyEmitted: string;
  private selectedRubric: string = null;
  private assignmentName = 'No Assignment';
  isRubric: boolean;
  overviewPage: boolean;
  // @ts-ignore
  @ViewChild('rubricContainer') rubricContainer: ElementRef;


  constructor(private appService: AppService, private dialogRef: MatDialogRef<RubricViewModalComponent>, private settingsService: SettingsService,
              private importService: ImportService,
              private rubricService: RubricService,
              private fb: FormBuilder, private assignmentService: AssignmentService,
              private busyService: BusyService,
              @Inject(MAT_DIALOG_DATA) config) {

    if (config != null) {
      if (config.assignmentSettingsInfo != null) {
        this.assignmentSettingsInfo = config.assignmentSettingsInfo;
        this.rubricMarking = config.assignmentSettingsInfo.rubric;
        this.assignmentName = config.assignmentName;
        this.overviewPage = true;


      } else {
        if (config.rubric != null) {
          this.rubricMarking = config.rubric;
        }
      }
    }
  }


  ngOnInit() {
    this.initForm();
    if (this.overviewPage) {
      this.rubricForm.controls.rubric.setValue(this.assignmentSettingsInfo.rubric.name);
      // this.previouslyEmitted = this.assignmentSettingsInfo.rubric.name;
      this.selectedRubric = this.assignmentSettingsInfo.rubric.name;
      this.rubricService.getRubricNames().subscribe((rubrics: IRubricName[]) => {
        this.rubrics = rubrics;
      });
    }

  }

  private initForm() {
    if (this.previouslyEmitted === null) {
      this.rubricForm = this.fb.group({
        rubric: [null]
      });
    } else {
      this.rubricForm = this.fb.group({
        rubric: [null]
      });
    }
    this.onRubricChange();
  }

  onClose() {
    this.dialogRef.close();
  }

  onRubricChange() {
    this.rubricForm.valueChanges.subscribe(value => {
      console.log(value.rubric !== this.previouslyEmitted && value.rubric !== this.selectedRubric);
      if (value.rubric !== this.previouslyEmitted && value.rubric !== this.selectedRubric) {
        this.previouslyEmitted = value.rubric;
        this.rubricMarkingSub = this.rubricService.getRubric(value.rubric).subscribe((rubric: IRubric) => {
          this.rubricMarking = rubric;
          this.selectedRubric = rubric.name;
        });
      }
    });
  }

  saveRubricChangeClick() {
    this.confirmWithUser();
  }

  saveRubricChange() {

    this.busyService.start();
    this.assignmentService.updateAssignmentRubric(this.selectedRubric, this.assignmentName).subscribe((rubric: IRubric) => {
      this.selectedRubric = (rubric) ? rubric.name : null;
      this.isRubric = !this.isNullOrUndefined(this.selectedRubric);
      this.appService.openSnackBar(true, 'Successfully updated rubric');
      this.busyService.stop();
    }, error => {
      this.busyService.stop();
      this.appService.openSnackBar(false, 'Unable to update rubric');
    });
    this.dialogRef.close();
  }

  onCancel() {
    this.dialogRef.close();
  }

  private isNullOrUndefined = (object: any): boolean => {
    return (object === null || object === undefined);
  }


  private confirmWithUser() {
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
      } else {
        this.rubricForm.controls.rubric.setValue(this.selectedRubric);
        this.isRubric = true;
      }
      this.previouslyEmitted = undefined;
    };

    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldChangeRubricFn);
  }

}
