import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {AlertService} from '../../services/alert.service';
import {AlertInfo, AlertInfoType} from '../../info-objects/alert.info';

@Component({
  selector: 'pdf-marker-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent implements OnInit, OnDestroy {

  @Input() id: string;

  readonly alertInfoTypes = AlertInfoType;
  alerts: AlertInfo[] = [];
  subscription: Subscription;

  constructor(private alertService: AlertService) { }

  ngOnInit() {
    this.subscription = this.alertService.onAlert(this.id)
      .subscribe(alert => {
        if (!alert.message) {
          // clear alerts when an empty alert is received
          this.alerts = [];
          return;
        }

        // add alert to array
        this.alerts.push(alert);
      });
  }

  ngOnDestroy() {
    // unsubscribe to avoid memory leaks
    this.subscription.unsubscribe();
  }

  removeAlert(alert: AlertInfo) {
    // remove specified alert from array
    this.alerts = this.alerts.filter(x => x !== alert);
  }

  cssClass(alert: AlertInfo) {
    if (!alert) {
      return undefined;
    }

    // return css class based on alert type
    switch (alert.type) {
      case AlertInfoType.Success:
        return 'alert alert-success';
      case AlertInfoType.Error:
        return 'alert alert-danger';
      case AlertInfoType.Info:
        return 'alert alert-info';
      case AlertInfoType.Warning:
        return 'alert alert-warning';
    }
  }

}
