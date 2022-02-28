import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router} from '@angular/router';
import {filter, map} from 'rxjs/operators';
import {AppService} from '../../services/app.service';
import {RoutesEnum} from '../../utils/routes.enum';
import {AppVersionInfo} from '@shared/info-objects/app-version.info';
import {Observable, Subscription} from "rxjs";
import {BusyService} from "../../services/busy.service";

@Component({
  selector: 'pdf-marker-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [AssignmentService]
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly title = 'PDF Marker';
  version: AppVersionInfo;
  isLoading: boolean;
  breadcrumbs: any;
  isMarkingPage: boolean;
  routeList: string[] = [];

  @ViewChild('content', {static: false})
  content: ElementRef;
  private subscription: Subscription;

  constructor(private router: Router,
              private activatedRoute: ActivatedRoute,
              private busyService: BusyService,
              private appService: AppService,
              private cd: ChangeDetectorRef) {
    this.subscription = this.busyService.busy$.subscribe(isloading => {
      this.isLoading = isloading;
      this.cd.detectChanges();
    });
  }

  ngOnInit() {
    this.appService.getAppVersion().subscribe((appVersionInfo: AppVersionInfo) => {
      if (appVersionInfo && appVersionInfo.version) {
        this.version = appVersionInfo;
      }
    });
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .pipe(map(() => this.activatedRoute))
      .pipe(map((route) => {
        while (route.firstChild) { route = route.firstChild; }
        return route;
      }))
      .pipe(filter(route => route.outlet === PRIMARY_OUTLET))
      .subscribe(route => {
        const snapshot = this.router.routerState.snapshot;
        this.breadcrumbs = [];
        this.routeList = [];
        const url = snapshot.url;
        const routeData = route.snapshot.data;

        const label = routeData['breadcrumb'];
        const params = snapshot.root.params;

        this.breadcrumbs = {
          url: url,
          label: label,
          params: params
        };

        this.breadcrumbs.url.split('/').forEach(route => {
          this.routeList.push(decodeURI(route));
        });

        if (this.router.url === RoutesEnum.ASSIGNMENT_MARKER) {
          this.isMarkingPage = true;
        } else {
          this.isMarkingPage = false;
        }
      });
  }

  ngAfterViewInit(): void {
    this.appService.setContainerElement(this.content);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
