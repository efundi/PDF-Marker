import {Component, Inject, Input, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {UpdateService} from '../../services/update.service';
import {UpdateInfo} from '@shared/info-objects/update-info';

@Component({
  selector: 'pdf-marker-update-modal',
  templateUrl: './update-modal.component.html',
  styleUrls: ['./update-modal.component.scss']
})
export class UpdateModalComponent implements OnInit {

  updateInfo: UpdateInfo;
  canSkip = false;

  constructor(
    private updateService: UpdateService,
    private dialogRef: MatDialogRef<UpdateModalComponent>,
    @Inject(MAT_DIALOG_DATA) private config) {

  }

  ngOnInit(): void {
    this.updateInfo = this.config.updateInfo;
    this.canSkip = this.config.canSkip;
  }
  no(): void {
    if (!this.canSkip) {
      this.updateService.scheduleInstall();
    }
    this.dialogRef.close();
  }

  yes(): void {
    this.dialogRef.close('restartApplication');
  }
}
