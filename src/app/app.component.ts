import {Component} from '@angular/core';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {UpdateService} from './services/update.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(private matIconRegistry: MatIconRegistry,
              private domSanitizer: DomSanitizer,
              private updateService: UpdateService) {
    this.matIconRegistry
      .addSvgIcon('halfTick', this.domSanitizer.bypassSecurityTrustResourceUrl('./assets/halftick.svg'))
      .addSvgIcon('layout-expand-left', this.domSanitizer.bypassSecurityTrustResourceUrl('./assets/layout-expand-left.svg'))
      .addSvgIcon('layout-expand-right', this.domSanitizer.bypassSecurityTrustResourceUrl('./assets/layout-expand-right.svg'))
      .addSvgIcon('layout-default', this.domSanitizer.bypassSecurityTrustResourceUrl('./assets/layout-default.svg'));

    this.updateService.initialise();


  }
}
