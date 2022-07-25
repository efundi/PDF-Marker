import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {AppVersionInfo} from '@shared/info-objects/app-version.info';
import {RoutesEnum} from '../../utils/routes.enum';
import {NavigationStart, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {Subscription} from 'rxjs';
import {find, isNil} from 'lodash';

@Component({
  selector: 'pdf-marker-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {

  constructor(private router: Router) {
  }

  menuOpen = false;

  @Input()
  appName: string;

  @Input()
  appVersion: AppVersionInfo;

  @Output()
  toggleMenu: EventEmitter<any> = new EventEmitter<any>();

  showCollapse = false;

  private routeSubscription: Subscription;

  private routesWithTree = [
    RoutesEnum.ASSIGNMENT_WORKSPACE_OVERVIEW,
    RoutesEnum.ASSIGNMENT_OVERVIEW,
    RoutesEnum.ASSIGNMENT_MARKER,
    RoutesEnum.PDF_VIEWER,
  ];

  ngOnInit() {
    this.routeSubscription = this.router.events.pipe(
      filter(e => e instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {

      const wasShowing = this.showCollapse;
      this.showCollapse = !isNil(find(this.routesWithTree, (path) => event.url.startsWith(path)));
      if (this.showCollapse && !wasShowing && !this.menuOpen) {
          this.menuToggleClicked();
      } else if (!this.showCollapse && wasShowing && this.menuOpen) {
        this.menuToggleClicked();
      }
    });
  }

  ngOnDestroy() {
    this.routeSubscription.unsubscribe();
  }

  menuToggleClicked() {
    this.menuOpen = !this.menuOpen;
    this.toggleMenu.emit(this.menuOpen);
  }

  goHome() {
    this.router.navigate([RoutesEnum.MARKER]);
  }
}
