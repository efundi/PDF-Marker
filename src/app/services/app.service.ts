import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {SnackBarComponent} from '../components/snack-bar/snack-bar.component';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import {ApplicationServiceIpc} from '@shared/ipc/application-service-ipc';
import {fromIpcResponse} from './ipc.utils';
import {AppVersionInfo} from '@shared/info-objects/app-version.info';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {FileFilterInfo} from '@shared/info-objects/file-filter.info';

export type ComponentType<T> = new (...args: any[]) => T;

@Injectable({
  providedIn: 'root'
})
export class AppService {

  private applicationApi: ApplicationServiceIpc;

  isLoading$: Subject<boolean> = new Subject<boolean>();

  isLoading = this.isLoading$.asObservable();

  private containerElement: any;

  public readonly client_id: string = 'PDF_MARKER';

  private readonly appName: string = 'PDF-MARKER';

  constructor(private dialog: MatDialog, private snackBar: MatSnackBar) {
    // this.isLoading$.next(false);

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


  getFile(fileFilter: FileFilterInfo): Observable<AppSelectedPathInfo> {
    return fromIpcResponse(this.applicationApi.getFile(fileFilter));
  }

  saveFile(fileFilter: FileFilterInfo): Observable<AppSelectedPathInfo> {
    if (!fileFilter.filename) {
      fileFilter.filename = 'download';
    }
    return fromIpcResponse(this.applicationApi.saveFile(fileFilter));
  }

  openExternalLink(externalResource: string): Observable<any> {
    return fromIpcResponse(this.applicationApi.openExternalLink(externalResource));
  }

  createDialog(component: ComponentType<any>, config: MatDialogConfig, callback: any = () => {}) {
    this.isLoading$.next(true);
    const dialogConfig: MatDialogConfig = config;
    if (!dialogConfig.disableClose) {
      dialogConfig.disableClose = false;
    }
    dialogConfig.autoFocus = true;

    const dialog = this.dialog.open(component, dialogConfig);
    dialog.afterOpened().subscribe(() => this.isLoading$.next(false));
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
