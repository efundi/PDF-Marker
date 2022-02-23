import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AppVersionInfo} from '@shared/info-objects/app-version.info';
import {RoutesEnum} from '../../utils/routes.enum';
import {Router} from '@angular/router';

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

  @Output()
  toggleMenu: EventEmitter<any> = new EventEmitter<any>();

  ngOnInit() {
  }

  menuToggleClicked() {
    this.toggleMenu.emit({});
  }

  goHome() {
    this.router.navigate([RoutesEnum.MARKER]);
  }
}
