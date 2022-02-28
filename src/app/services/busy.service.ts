import { Injectable } from '@angular/core';
import {Observable, ReplaySubject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class BusyService {

  private busySubject = new ReplaySubject<boolean>(1);
  busy$: Observable<boolean>;
  busy = false;

  /**
   * Number of hits calling busy
   * @private
   */
  private busyCount = 0;

  constructor() {
    this.busy$ = this.busySubject.asObservable();
  }

  start(): void {
    this.busyCount++;
    this.updateBusyStatus();
  }

  stop(): void {
    if (this.busyCount === 0) {
      console.error('Stop called too many times');
      return;
    }
    this.busyCount--;
    this.updateBusyStatus();
  }

  private updateBusyStatus(): void {
    const previousBusy = this.busy;
    const currentBusy = this.busyCount > 0;

    if (previousBusy !== currentBusy) {
      this.busy = currentBusy;
      this.busySubject.next(this.busy);
    }
  }
}
