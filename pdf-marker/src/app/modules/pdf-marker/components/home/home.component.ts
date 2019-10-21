import {Component, OnDestroy, OnInit} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router} from "@angular/router";
import {filter, map} from "rxjs/operators";

@Component({
  selector: 'pdf-marker-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [AssignmentService]
})
export class HomeComponent implements OnInit, OnDestroy {
  breadcrumbs: any;
  routeList: string[];
  constructor(private router: Router,
              private activatedRoute: ActivatedRoute) { }

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
        let url = snapshot.url;
        let routeData = route.snapshot.data;

        console.log(routeData);
        let label = routeData['breadcrumb'];
        let params = snapshot.root.params;

        this.breadcrumbs = {
          url: url,
          label: label,
          params: params
        };

        this.routeList = this.breadcrumbs.url.split("/");
      });
  }

  ngOnDestroy(): void {
  }

}
