import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {CreateAssignmentComponent} from '../components/create-assignment/create-assignment.component';

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard implements CanDeactivate<CreateAssignmentComponent> {

  constructor(){}

  canDeactivate(
    component: CreateAssignmentComponent,
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return (!component.hasUnsavedChanges()) ? true : confirm('You have unsaved changes. Do you wish to continue?');
  }


}
