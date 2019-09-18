import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {WelcomeComponent} from "@pdfMarkerModule/welcome/welcome.component";
import {ImportComponent} from "@pdfMarkerModule/import/import.component";


const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'import', component: ImportComponent },
  { path: '**', redirectTo: '', pathMatch: 'full'}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PdfMarkerRoutingModule { }
