import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';


const routes: Routes = [
  { path: '', redirectTo: '/marker', pathMatch: 'full' },
  { path: 'marker', loadChildren: () => import('@pdfMarkerModule/pdf-marker.module').then(m => m.PdfMarkerModule)}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
