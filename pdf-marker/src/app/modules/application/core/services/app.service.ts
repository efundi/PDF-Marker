import {Injectable} from '@angular/core';
import {Subject} from "rxjs";
import {MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {SnackBarComponent} from "@sharedModule/components/snack-bar/snack-bar.component";
import {MatSnackBar, MatSnackBarRef} from "@angular/material/snack-bar";

export interface ComponentType<T> {
  new (...args: any[]): T;
}

@Injectable({
  providedIn: 'root'
})
export class AppService {

  isLoading$: Subject<boolean> = new Subject<boolean>();

  private containerElement: any;

  public readonly client_id: string = "PDF_MARKER";

  constructor(private dialog: MatDialog, private snackBar: MatSnackBar) { }

  initializeScrollPosition() {
    this.containerElement.elementRef.nativeElement.scrollTop = 0;
  }

  setContainerElement(element: any) {
    this.containerElement = element;
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
    if(typeof callback === 'function')
      dialog.afterClosed().subscribe(callback);
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
