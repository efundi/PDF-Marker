import {Injectable} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {UpdateModalComponent} from '../components/update-modal/update-modal.component';
import {UpdateIpcService} from '@shared/ipc/update.ipc-service';
import {fromIpcResponse} from './ipc.utils';
import {Observable} from 'rxjs';
import {UpdateCheckResult, UpdateInfo} from '@shared/info-objects/update-info';
import {isNil} from 'lodash';
import {ConfirmationDialogComponent} from '../components/confirmation-dialog/confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {

  private updateApi: UpdateIpcService;

  constructor(private dialog: MatDialog) {
    this.updateApi = (window as any).updateApi;
  }


  private promptRestartApplication(updateCheckResult: UpdateCheckResult, updateInfo: UpdateInfo): void {
    const dialogConfig: MatDialogConfig = {
      autoFocus: true,
      disableClose: true,
      data: {
        updateInfo,
        canSkip: updateCheckResult.canSkip,
      }
    };

    const dialog = this.dialog.open(UpdateModalComponent, dialogConfig);
    dialog.beforeClosed().subscribe((result) => {
      if (result === 'restartApplication') {
        this.restartApplication();
      }
    });
  }


  private executeDownload(updateCheckResult: UpdateCheckResult): void {
    this.downloadUpdate().subscribe({
      next: (updateInfo) => {
        this.promptRestartApplication(updateCheckResult, updateInfo);
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
      if (!isNil(data)) {
        this.executeDownload(data);
      }
    });
  }

  restartApplication() {
    this.updateApi.restartApplication();
  }

  scheduleInstall() {
    this.updateApi.scheduleInstall();
  }
}
