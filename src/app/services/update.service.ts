import {Injectable} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {UpdateModalComponent} from '../components/update-modal/update-modal.component';
import {UpdateIpcService} from '@shared/ipc/update.ipc-service';
import {fromIpcResponse} from './ipc.utils';
import {Observable} from 'rxjs';
import {UpdateCheckResult, UpdateInfo} from '@shared/info-objects/update-info';
import {isNil} from 'lodash';
import {YesAndNoConfirmationDialogComponent} from '../components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {

  private updateApi: UpdateIpcService;

  constructor(private dialog: MatDialog) {
    this.updateApi = (window as any).updateApi;
  }


  private promptRestartApplication(updateInfo: UpdateInfo){
    const dialogConfig: MatDialogConfig = {
      autoFocus: true,
      disableClose: true,
      data: {
        updateInfo,
        state : 'restart',
      }
    };

    const dialog = this.dialog.open(UpdateModalComponent, dialogConfig);
    dialog.beforeClosed().subscribe((result) => {
      if (result === 'restartApplication') {
        this.restartApplication();
      }
    });
  }

  private promptDownloadUpdate(updateCheckResult: UpdateCheckResult) {
    const dialogConfig: MatDialogConfig = {
      autoFocus: true,
      disableClose: true,
      data: {
        updateInfo: updateCheckResult.updateInfo,
        canSkip: updateCheckResult.canSkip,
        state : 'waiting'
      }
    };

    const dialog = this.dialog.open(UpdateModalComponent, dialogConfig);
    dialog.beforeClosed().subscribe((result) => {
      if ('download' === result) {
        this.executeDownload();
      }
    });
  }

  private executeDownload() {
    this.downloadUpdate().subscribe({
      next: (updateInfo) => {
        this.promptRestartApplication(updateInfo);
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  private checkForUpdate(): Observable<UpdateCheckResult | null> {
    return fromIpcResponse(this.updateApi.checkForUpdate());
  }

  private downloadUpdate(): Observable<UpdateInfo> {
    return fromIpcResponse(this.updateApi.downloadUpdate());
  }

  initialise(): void {
    this.checkForUpdate().subscribe((data) => {
      if (!isNil(data) && !isNil(data.cancellationToken)) {
        this.promptDownloadUpdate(data);
      }
    });
  }

  restartApplication() {
    this.updateApi.restartApplication();
  }
}
