import { Component, ElementRef } from '@angular/core';
import {MatIconRegistry} from "@angular/material/icon";
import {DomSanitizer} from "@angular/platform-browser";
import {SettingsService} from '@pdfMarkerModule/services/settings.service';
import {AppService} from '@coreModule/services/app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(private matIconRegistry: MatIconRegistry,
              private domSanitizer: DomSanitizer,
              private settingsService: SettingsService,
              private appService: AppService,
              private elementRef: ElementRef) {
    this.matIconRegistry
      .addSvgIcon("halfTick", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/halftick.svg"))
      .addSvgIcon("layout-expand-left", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/layout-expand-left.svg"))
      .addSvgIcon("layout-expand-right", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/layout-expand-right.svg"))
      .addSvgIcon("layout-default", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/layout-default.svg"));
    this.settingsService.getConfigurations().subscribe(configurations => {
      if (configurations.defaultColour) {
        this.elementRef.nativeElement.style.setProperty('--pdf-marker-primary', configurations.defaultColour);
      }
    }, error => {
      this.appService.isLoading$.next(false);
    });

  }
}
