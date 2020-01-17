import {Component, OnInit} from '@angular/core';

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
    { title: "Import", toolTip: "Import Zip from default LMS", icon: "archive", href: "/marker/assignment/import" },
    { title: "Upload", toolTip: "Upload PDF file(s)", icon: "picture_as_pdf", href:"/marker/assignment/upload" },
    //{ title: this.settings, toolTip: "App Settings", icon: "settings" },
    { title: "Settings", toolTip: "Settings", icon: "settings"},
  ];

  readonly menuItems = [
    { title: "App Settings", icon: "build", href: "/marker/assignment/settings" },
    { title: "Rubrics", icon: "apps", href: "/marker/assignment/rubric" }
  ]
}
