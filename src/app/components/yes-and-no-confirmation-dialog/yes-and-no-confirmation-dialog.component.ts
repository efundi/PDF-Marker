import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'pdf-marker-yes-and-no-confirmation-dialog',
  templateUrl: './yes-and-no-confirmation-dialog.component.html',
  styleUrls: ['./yes-and-no-confirmation-dialog.component.scss']
})
export class YesAndNoConfirmationDialogComponent implements OnInit {

  title: string;

  message: string;

  readonly yes: boolean = true;

  readonly no: boolean = false;

  constructor(private dialogRef: MatDialogRef<YesAndNoConfirmationDialogComponent>,
              @Inject(MAT_DIALOG_DATA) config) {
    this.title = config.title;
    this.message = config.message;
  }

  ngOnInit() {
  }

  onButtonClick(isConfirm: boolean) {
    this.dialogRef.close(isConfirm);
  }

}
