import {Component, OnInit} from '@angular/core';
import {RoutesEnum} from "@coreModule/utils/routes.enum";

@Component({
  selector: 'pdf-marker-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  readonly settings: string = "Settings";

  constructor() { }

  ngOnInit() {
  }

  readonly toolbarMenu = [
    { title: "Import", toolTip: "Import Zip from default LMS", icon: "archive", href: RoutesEnum.ASSIGNMENT_IMPORT },
    { title: "Upload", toolTip: "Upload PDF file(s)", icon: "picture_as_pdf", href: RoutesEnum.ASSIGNMENT_UPLOAD },
    { title: "Settings", toolTip: "Settings", icon: "settings"},
  ];

  readonly menuItems = [
    { title: "App Settings", icon: "build", href: RoutesEnum.ASSIGNMENT_SETTINGS },
    { title: "Rubrics", icon: "apps", href: RoutesEnum.ASSIGNMENT_RUBRICS }
  ]
}
