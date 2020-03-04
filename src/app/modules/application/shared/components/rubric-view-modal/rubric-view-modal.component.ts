import {Component, ElementRef, Inject, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {AppService} from "@coreModule/services/app.service";
import {MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef} from "@angular/material/dialog";
import {IRubric, IRubricCriteria, IRubricName, Rubric} from "@coreModule/utils/rubric.class";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {FormBuilder, FormGroup} from "@angular/forms";
import {SettingsService} from "@pdfMarkerModule/services/settings.service";
import {ImportService} from "@pdfMarkerModule/services/import.service";
import {Subscription} from "rxjs";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {YesAndNoConfirmationDialogComponent} from "@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component";


@Component({
  selector: 'pdf-marker-rubric-view-modal',
  templateUrl: './rubric-view-modal.component.html',
  styleUrls: ['./rubric-view-modal.component.scss'],
})
export class RubricViewModalComponent implements OnInit {

  rubricName: string;
  @Input() rubricMarking: IRubric;
  rubricMarkingSub: Subscription;
  @Input() assignmentSettingsInfo: AssignmentSettingsInfo
  rubricForm: FormGroup;
  rubrics: IRubricName[] = [];
  private previouslyEmitted: string;
  private selectedRubric: string = null;
  private assignmentName: string = "No Assignment";
  isRubric: boolean;
  overviewPage: boolean;
  // @ts-ignore
  @ViewChild('rubricContainer') rubricContainer: ElementRef;


  constructor(private appService: AppService, private dialogRef: MatDialogRef<RubricViewModalComponent>, private settingsService: SettingsService,
              private importService: ImportService,
              private fb: FormBuilder, private assignmentService: AssignmentService,
              @Inject(MAT_DIALOG_DATA) config) {

    if (config != null) {
      if (config.assignmentSettingsInfo != null) {
        this.assignmentSettingsInfo = config.assignmentSettingsInfo;
        this.rubricMarking =config.assignmentSettingsInfo.rubric;
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
    this.rubricForm.controls.rubric.setValue(this.assignmentSettingsInfo.rubric.name);
    //this.previouslyEmitted = this.assignmentSettingsInfo.rubric.name;
    this.selectedRubric = this.assignmentSettingsInfo.rubric.name;
    this.importService.getRubricDetails().subscribe((rubrics: IRubricName[]) => {
      this.rubrics = rubrics;
    });


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
        let rubric = {rubricName: value.rubric};
        this.rubricMarkingSub = this.importService.getRubricContents(rubric).subscribe((rubric: IRubric) => {
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

    this.appService.isLoading$.next(true);
    this.assignmentService.updateAssignmentRubric(this.selectedRubric, this.assignmentName).subscribe((rubric: IRubric) => {
      this.selectedRubric = (rubric) ? rubric.name : null;
      this.isRubric = !this.isNullOrUndefined(this.selectedRubric);
      this.appService.openSnackBar(true, "Successfully updated rubric");
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to update rubric");
    });
    this.dialogRef.close();
  }

  onCancel() {
    this.dialogRef.close();
  }

  private isNullOrUndefined = (object: any): boolean => {
    return (object === null || object === undefined);
  };


  private confirmWithUser() {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "400px";
    config.data = {
      title: "Confirmation",
      message: "Changing or attaching a rubric to an assignment will erase previously marked assignment submission, do you wish to continue?",
    };
    const shouldChangeRubricFn = (shouldChangeRubric: boolean) => {
      if(shouldChangeRubric) {
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
