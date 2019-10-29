import {Injectable} from '@angular/core';
import {CanDeactivate} from '@angular/router';
import {AssignmentMarkingComponent} from "@pdfMarkerModule/components/assignment-marking/assignment-marking.component";

@Injectable({
  providedIn: 'root'
})
export class MarkingGuard implements CanDeactivate<AssignmentMarkingComponent> {
  canDeactivate(component: AssignmentMarkingComponent): boolean {
    /*if(component.isSaveRequired()) {
      return (confirm("You have unsaved changes! If you leave, your changes will be lost."));
    }*/
    return true;
  }

}
