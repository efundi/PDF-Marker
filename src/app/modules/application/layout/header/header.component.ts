import {Component, Input, OnInit} from '@angular/core';
import {AppVersionInfo} from "@coreModule/info-objects/app-version.info";
import {RoutesEnum} from "@coreModule/utils/routes.enum";
import {Router} from "@angular/router";

@Component({
  selector: 'pdf-marker-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(private router: Router) {
  }

  @Input()
  appName: string;

  @Input()
  appVersion: AppVersionInfo;

  ngOnInit() {
  }
  goHome() {
    this.router.navigate([RoutesEnum.MARKER]);
  }
}
