import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {CreateAssignmentComponent} from "@pdfMarkerModule/components/create-assignment/create-assignment.component";
import {AppService} from "@coreModule/services/app.service";
import {AssignmentDetails} from "@pdfMarkerModule/components/assignment-overview/assignment-overview.component";
import {AssignmentService} from "@sharedModule/services/assignment.service";

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard implements CanDeactivate<CreateAssignmentComponent> {

  constructor(private appService: AppService, private assignmentService: AssignmentService) {
  }

  canDeactivate(
    component:CreateAssignmentComponent,
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    const shouldLeave: boolean = (!component.hasUnsavedChanges()) ? true:confirm("You have unsaved changes. Do you wish to continue?");
    if(!shouldLeave) {
      this.appService.isLoading$.next(false);
    }

    return shouldLeave;
  }


}
