import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {SharedModule} from '@sharedModule/shared.module';
import {LayoutModule} from '@layoutModule/layout.module';
import {PdfMarkerModule} from "@pdfMarkerModule/pdf-marker.module";

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    SharedModule,
    LayoutModule,
    PdfMarkerModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
