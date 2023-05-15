import {Component, OnInit} from '@angular/core';
import {RoutesEnum} from '../../utils/routes.enum';
import {DEFAULT_WORKSPACE} from '@shared/constants/constants';

@Component({
  selector: 'pdf-marker-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  readonly settings: string = 'Settings';

  readonly toolbarMenu = [
    { id: 'Home',  toolTip: 'Home', icon: 'home', href: RoutesEnum.MARKER, exact: true},
    { title: 'Assignments', toolTip: 'Assignments', icon: 'assignment_outlined', href: RoutesEnum.ASSIGNMENT_WORKSPACE_OVERVIEW + '/' + DEFAULT_WORKSPACE },
    { title: 'Import', toolTip: 'Import Zip File', icon: 'unarchive', href: RoutesEnum.ASSIGNMENT_IMPORT },
    { title: 'Upload', toolTip: 'Upload PDF File(s)', icon: 'assignment_add', href: RoutesEnum.ASSIGNMENT_UPLOAD },
    { title: 'Settings', toolTip: 'Settings', icon: 'settings'},
  ];

  readonly menuItems = [
    { id: 'settings', title: 'App Settings', icon: 'build', href: RoutesEnum.ASSIGNMENT_SETTINGS },
    { id: 'rubrics',  title: 'Rubrics', icon: 'apps', href: RoutesEnum.ASSIGNMENT_RUBRICS },
    { id: 'comments',  title: 'Generic Comments', icon: 'comment', href: RoutesEnum.ASSIGNMENT_COMMENTS },
    { id: 'workingFolder',  title: 'Working Folders', icon: 'folder', href: RoutesEnum.ASSIGNMENT_WORKING_FOLDER },
    { id: 'markers' , title: 'Markers', icon: 'person', href: RoutesEnum.MARKERS_MANAGE },
  ];
  constructor() { }

  ngOnInit() {
  }
}
