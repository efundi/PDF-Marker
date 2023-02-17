import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {SnackBarComponent} from '../components/snack-bar/snack-bar.component';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import {ApplicationIpcService} from '@shared/ipc/application.ipc-service';
import {fromIpcResponse} from './ipc.utils';
import {AppVersionInfo} from '@shared/info-objects/app-version.info';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {OpenFileInfo, SaveFileInfo} from '@shared/info-objects/file-filter.info';

export type ComponentType<T> = new (...args: any[]) => T;

@Injectable({
  providedIn: 'root'
})
export class AppService {

  private applicationApi: ApplicationIpcService;

  private containerElement: any;

  public readonly client_id: string = 'PDF_MARKER';

  private readonly appName: string = 'PDF-MARKER';

  constructor(private dialog: MatDialog,
              private snackBar: MatSnackBar) {

    this.applicationApi = (window as any).applicationApi;
  }

  initializeScrollPosition() {
    this.containerElement.elementRef.nativeElement.scrollTop = 0;
  }

  setContainerElement(element: any) {
    this.containerElement = element;
  }

  getContainerElement() {
    return this.containerElement;
  }


  getAppVersion(): Observable<AppVersionInfo> {
    return fromIpcResponse(this.applicationApi.getAppVersion());
  }

  getFolder(): Observable<AppSelectedPathInfo> {
    return fromIpcResponse(this.applicationApi.getFolder());
  }


  getFile(fileFilter: OpenFileInfo): Observable<AppSelectedPathInfo> {
    return fromIpcResponse(this.applicationApi.getFile(fileFilter));
  }

  saveFile(fileFilter: SaveFileInfo): Observable<AppSelectedPathInfo> {
    if (!fileFilter.filename) {
      fileFilter.filename = 'download';
    }
    return fromIpcResponse(this.applicationApi.saveFile(fileFilter));
  }

  openExternalLink(externalResource: string): Observable<any> {
    return fromIpcResponse(this.applicationApi.openExternalLink(externalResource));
  }

  createDialog(component: ComponentType<any>, config: MatDialogConfig, callback: any = () => {}) {
    const dialogConfig: MatDialogConfig = config;
    if (!dialogConfig.disableClose) {
      dialogConfig.disableClose = false;
    }
    dialogConfig.autoFocus = true;

    const dialog = this.dialog.open(component, dialogConfig);
    if (typeof callback === 'function') {
      dialog.afterClosed().subscribe(callback);
    }
    return dialog;
  }

  /*For API responses*/
  openSnackBar(isSuccessful: boolean, message: string, component: ComponentType<any> = SnackBarComponent): MatSnackBarRef<any> {
    return this.snackBar.openFromComponent(component, {
      data: {
        isSuccessful: isSuccessful,
        message: message
      }
    });
  }
}
