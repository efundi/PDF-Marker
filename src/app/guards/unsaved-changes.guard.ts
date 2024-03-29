import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {CreateAssignmentComponent} from '../components/create-assignment/create-assignment.component';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ConfirmationDialogComponent} from '../components/confirmation-dialog/confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard implements CanDeactivate<CreateAssignmentComponent> {
  constructor(private dialog: MatDialog) {
  }
  canDeactivate(
    component: CreateAssignmentComponent,
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

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
