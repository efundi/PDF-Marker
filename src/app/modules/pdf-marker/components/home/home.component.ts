import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router} from "@angular/router";
import {filter, map} from "rxjs/operators";
import {AppService} from "@coreModule/services/app.service";
import {RoutesEnum} from "@coreModule/utils/routes.enum";

@Component({
  selector: 'pdf-marker-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [AssignmentService]
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly title = 'PDF Marker';
  isLoading$ = this.appService.isLoading$;

  breadcrumbs: any;
  isMarkingPage: boolean;
  routeList: string[] = [];

  @ViewChild("content", {static: false})
  content: ElementRef;
  constructor(private router: Router,
              private activatedRoute: ActivatedRoute,
              private appService: AppService,
              private cdRef: ChangeDetectorRef) {
  }

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .pipe(map(() => this.activatedRoute))
      .pipe(map((route) => {
        while (route.firstChild) { route = route.firstChild; }
        return route;
      }))
      .pipe(filter(route => route.outlet === PRIMARY_OUTLET))
      .subscribe(route => {
        let snapshot = this.router.routerState.snapshot;
        this.breadcrumbs = [];
        this.routeList = [];
        let url = snapshot.url;
        let routeData = route.snapshot.data;

        let label = routeData['breadcrumb'];
        let params = snapshot.root.params;

        this.breadcrumbs = {
          url: url,
          label: label,
          params: params
        };

        this.breadcrumbs.url.split("/").forEach(route => {
          this.routeList.push(decodeURI(route))
        });

        if (this.router.url === RoutesEnum.ASSIGNMENT_MARKER)
          this.isMarkingPage = true;
        else
          this.isMarkingPage = false;
      });
  }

  ngAfterViewInit(): void {
    this.appService.setContainerElement(this.content);
    //this.cdRef.detectChanges();
  }

  ngOnDestroy(): void {
  }

}
