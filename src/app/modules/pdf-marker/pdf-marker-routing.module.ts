import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {WelcomeComponent} from "@pdfMarkerModule/components/welcome/welcome.component";
import {ImportComponent} from "@pdfMarkerModule/components/import/import.component";
import {SettingsComponent} from '@pdfMarkerModule/components/settings/settings.component';
import {AssignmentOverviewComponent} from "@pdfMarkerModule/components/assignment-overview/assignment-overview.component";
import {AssignmentMarkingComponent} from "@pdfMarkerModule/components/assignment-marking/assignment-marking.component";
import { CreateAssignmentComponent } from './components/create-assignment/create-assignment.component';
import {RubricImportComponent} from "@pdfMarkerModule/components/rubric-import/rubric-import.component";
import {AssignmentMarkingRubricComponent} from "@pdfMarkerModule/components/assignment-marking-rubric/assignment-marking-rubric.component";
import {UnsavedChangesGuard} from "@pdfMarkerModule/guards/unsaved-changes.guard";


const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'assignment/settings', component: SettingsComponent },
  { path: 'assignment/import', component: ImportComponent },
  { path: 'assignment/upload', component: CreateAssignmentComponent },
  { path: 'assignment/upload/:id', component: CreateAssignmentComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'assignment/overview', component: AssignmentOverviewComponent },
  { path: 'assignment/marking', component: AssignmentMarkingComponent },
  { path: 'assignment/marking/rubric', component: AssignmentMarkingRubricComponent },
  { path: 'assignment/rubric', component: RubricImportComponent },
  { path: '**', redirectTo: '', pathMatch: 'full'}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PdfMarkerRoutingModule { }
