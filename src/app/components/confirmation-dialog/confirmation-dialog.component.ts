import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {isNil} from 'lodash';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  yesText?: string;
  noText?: string;
  showNo?: boolean;
}

@Component({
  selector: 'pdf-marker-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent implements OnInit {

  config: ConfirmationDialogData;

  readonly yes: boolean = true;

  readonly no: boolean = false;

  constructor(private dialogRef: MatDialogRef<ConfirmationDialogComponent>,
              @Inject(MAT_DIALOG_DATA) private inputConfig: ConfirmationDialogData) {
    this.config = {
      ...inputConfig,
      yesText: inputConfig.yesText || 'Yes',
      noText: inputConfig.yesText || 'No',
      showNo: isNil(inputConfig.showNo) ? true : inputConfig.showNo
    };
  }

  ngOnInit() {
  }

  onButtonClick(isConfirm: boolean) {
    this.dialogRef.close(isConfirm);
  }

}
