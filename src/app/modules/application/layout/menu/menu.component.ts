import {Component, OnInit} from '@angular/core';
import {RoutesEnum} from "@coreModule/utils/routes.enum";

@Component({
  selector: 'pdf-marker-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  readonly settings: string = "Settings";

  readonly toolbarMenu = [
    { id: "Home",  toolTip: "Home", icon: "home", href: RoutesEnum.MARKER},
    { title: "Import", toolTip: "Import Zip File", icon: "unarchive", href: RoutesEnum.ASSIGNMENT_IMPORT },
    { title: "Upload", toolTip: "Upload PDF File(s)", icon: "picture_as_pdf", href: RoutesEnum.ASSIGNMENT_UPLOAD },
    { title: "Settings", toolTip: "Settings", icon: "settings"},
  ];

  readonly menuItems = [
    { id: "settings", title: "App Settings", icon: "build", href: RoutesEnum.ASSIGNMENT_SETTINGS },
    { id: "rubrics",  title: "Rubrics", icon: "apps", href: RoutesEnum.ASSIGNMENT_RUBRICS },
    { id: "comments",  title: "Generic Comments", icon: "comment_bank", href: RoutesEnum.ASSIGNMENT_COMMENTS },
    { id: "workingFoler",  title: "Working Folders", icon: "folder", href: RoutesEnum.ASSIGNMENT_WORKING_FOLDER }
  ];
  constructor() { }

  ngOnInit() {
  }
}
