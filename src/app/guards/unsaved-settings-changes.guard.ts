import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import {SettingsComponent} from '../components/settings/settings.component';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ConfirmationDialogComponent} from '../components/confirmation-dialog/confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class UnsavedSettingsChangesGuard  {
  constructor(private dialog: MatDialog) {
  }
  canDeactivate(
    component: SettingsComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (component.hasUnsavedChanges()) {
      const config = new MatDialogConfig();
      config.data = {
        title : 'Unsaved changes',
        message : 'You have unsaved changes. Do you wish to continue?'
      };
      const dialog = this.dialog.open(ConfirmationDialogComponent, config);
      return dialog.afterClosed();
    } else {
      return true;
    }
  }
}
