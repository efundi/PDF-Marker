import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PdfMarkerRoutingModule } from './pdf-marker-routing.module';
import { HomeComponent } from './home/home.component';
import {SharedModule} from "@sharedModule/shared.module";
import {LayoutModule} from "@layoutModule/layout.module";
import { WelcomeComponent } from './welcome/welcome.component';


@NgModule({
  declarations: [HomeComponent, WelcomeComponent ],
  imports: [
    CommonModule,
    SharedModule,
    LayoutModule,
    PdfMarkerRoutingModule
  ],
  exports: [HomeComponent]
})
export class PdfMarkerModule { }
