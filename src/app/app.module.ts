import {BrowserModule, BrowserTransferStateModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {SharedModule} from '@sharedModule/shared.module';
import {LayoutModule} from '@layoutModule/layout.module';
import {PdfMarkerModule} from '@pdfMarkerModule/pdf-marker.module';
import {CoreModule} from '@coreModule/core.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
    BrowserTransferStateModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    CoreModule,
    SharedModule,
    LayoutModule,
    PdfMarkerModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
