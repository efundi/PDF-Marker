import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PdfMarkerRoutingModule } from './pdf-marker-routing.module';
import {SharedModule} from "@sharedModule/shared.module";
import {LayoutModule} from "@layoutModule/layout.module";
import { HomeComponent } from '@pdfMarkerModule/components/home/home.component';
import { WelcomeComponent } from '@pdfMarkerModule/components/welcome/welcome.component';
import { ImportComponent } from '@pdfMarkerModule/components/import/import.component';
import {SettingsComponent} from '@pdfMarkerModule/components/settings/settings.component';


@NgModule({
  declarations: [HomeComponent, WelcomeComponent, ImportComponent, SettingsComponent ],
  imports: [
    CommonModule,
    SharedModule,
    LayoutModule,
    PdfMarkerRoutingModule
  ],
  exports: [HomeComponent]
})
export class PdfMarkerModule { }
