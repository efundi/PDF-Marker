import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {MatIconRegistry} from "@angular/material/icon";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  selector: 'pdf-marker-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {

  constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer,) {
    this.matIconRegistry.addSvgIcon(
      "halfTick",
      this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/halftick.svg")
    );
    this.matIconRegistry.addSvgIcon(
      "layout-expand-left",
      this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/layout-expand-left.svg")
    );
    this.matIconRegistry.addSvgIcon(
      "layout-expand-right",
      this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/layout-expand-right.svg")
    );
    this.matIconRegistry.addSvgIcon(
      "layout-default",
      this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/layout-default.svg")
    );}

  ngOnInit() {
  }

}
