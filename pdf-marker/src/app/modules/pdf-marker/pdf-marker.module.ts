import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {PdfMarkerRoutingModule} from './pdf-marker-routing.module';
import {SharedModule} from "@sharedModule/shared.module";
import {LayoutModule} from "@layoutModule/layout.module";
import {HomeComponent} from '@pdfMarkerModule/components/home/home.component';
import {WelcomeComponent} from '@pdfMarkerModule/components/welcome/welcome.component';
import {ImportComponent} from '@pdfMarkerModule/components/import/import.component';
import {SettingsComponent} from '@pdfMarkerModule/components/settings/settings.component';
import {AssignmentOverviewComponent} from '@pdfMarkerModule/components/assignment-overview/assignment-overview.component';
import {SettingsService} from "@pdfMarkerModule/services/settings.service";
import {ImportService} from "@pdfMarkerModule/services/import.service";
import {IconsComponent} from './components/icons/icons.component';
import {MarkTypeIconComponent} from "@pdfMarkerModule/components/mark-type-icon/mark-type-icon.component";
import {AssignmentMarkingComponent} from "@pdfMarkerModule/components/assignment-marking/assignment-marking.component";

import {PdfJsViewerModule} from 'ng2-pdfjs-viewer';
import {ColorPickerModule} from "ngx-color-picker";
import {FinaliseMarkingComponent} from './components/finalise-marking/finalise-marking.component';

@NgModule({
  declarations: [HomeComponent, WelcomeComponent, ImportComponent, SettingsComponent, AssignmentOverviewComponent, IconsComponent, AssignmentMarkingComponent, FinaliseMarkingComponent, MarkTypeIconComponent],
  imports: [
    CommonModule,
    SharedModule,
    LayoutModule,
    PdfMarkerRoutingModule,
    PdfJsViewerModule,
    ColorPickerModule
  ],
  providers: [SettingsService, ImportService],
  exports: [HomeComponent],
  entryComponents: [MarkTypeIconComponent, FinaliseMarkingComponent, MarkTypeIconComponent]
})
export class PdfMarkerModule { }
