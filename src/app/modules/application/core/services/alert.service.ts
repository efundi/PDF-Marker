import { Injectable } from '@angular/core';
import {Observable, Subject} from "rxjs";
import {AlertInfo, AlertInfoType} from "@coreModule/info-objects/alert.info";
import {NavigationStart, Router} from "@angular/router";
import {filter} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private subject = new Subject<AlertInfo>();
  private keepAfterRouteChange = false;

  constructor(private router: Router) {
    // clear alert messages on route change unless 'keepAfterRouteChange' flag is true
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (this.keepAfterRouteChange) {
          // only keep for a single route change
          this.keepAfterRouteChange = false;
        } else {
          // clear alert messages
          this.clear();
        }
      }
    });
  }

  // enable subscribing to alerts observable
  onAlert(alertId?: string): Observable<AlertInfo> {
    return this.subject.asObservable().pipe(filter(x => x && x.alertId === alertId));
  }

  // convenience methods
  success(message: string, alertId?: string) {
    this.alert(new AlertInfo({ message, type: AlertInfoType.Success, alertId }));
  }

  error(message: string, alertId?: string) {
    this.alert(new AlertInfo({ message, type: AlertInfoType.Error, alertId }));
  }

  info(message: string, alertId?: string) {
    this.alert(new AlertInfo({ message, type: AlertInfoType.Info, alertId }));
  }

  warn(message: string, alertId?: string) {
    this.alert(new AlertInfo({ message, type: AlertInfoType.Warning, alertId }));
  }

  // main alert method
  alert(alert: AlertInfo) {
    //this.clear();
    this.keepAfterRouteChange = alert.keepAfterRouteChange;
    this.subject.next(alert);
  }

  // clear alerts
  clear(alertId?: string) {
    this.subject.next(new AlertInfo({ alertId }));
  }
}
