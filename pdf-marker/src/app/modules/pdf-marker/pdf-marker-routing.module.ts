import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {WelcomeComponent} from "@pdfMarkerModule/components/welcome/welcome.component";
import {ImportComponent} from "@pdfMarkerModule/components/import/import.component";
import {SettingsComponent} from '@pdfMarkerModule/components/settings/settings.component';


const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'import', component: ImportComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '', pathMatch: 'full'}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PdfMarkerRoutingModule { }
