import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {WelcomeComponent} from "@pdfMarkerModule/components/welcome/welcome.component";
import {ImportComponent} from "@pdfMarkerModule/components/import/import.component";
import {SettingsComponent} from '@pdfMarkerModule/components/settings/settings.component';
import {AssignmentOverviewComponent} from "@pdfMarkerModule/components/assignment-overview/assignment-overview.component";


const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'assignment/settings', component: SettingsComponent },
  { path: 'assignment/import', component: ImportComponent },
  { path: 'assignment/overview', component: AssignmentOverviewComponent },
  { path: '**', redirectTo: '', pathMatch: 'full'}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PdfMarkerRoutingModule { }
