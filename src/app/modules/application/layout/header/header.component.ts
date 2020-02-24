import {Component, Input, OnInit} from '@angular/core';
import {AppVersionInfo} from "@coreModule/info-objects/app-version.info";

@Component({
  selector: 'pdf-marker-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  @Input()
  appName: string;

  @Input()
  appVersion: AppVersionInfo;

  ngOnInit() {
  }

}
