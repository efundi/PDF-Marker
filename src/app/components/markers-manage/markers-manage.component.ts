import {Component, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {SettingsService} from '../../services/settings.service';
import {BusyService} from '../../services/busy.service';
import {AppService} from '../../services/app.service';
import {Observable, ReplaySubject} from 'rxjs';

@Component({
  selector: 'pdf-marker-markers-manage',
  templateUrl: './markers-manage.component.html',
  styleUrls: ['./markers-manage.component.scss']
})
export class MarkersManageComponent implements OnInit {


  /**
   * Original settings as returned from file
   * @private
   */
  private originalSettings: SettingInfo;

  private settingsReplaySubject = new ReplaySubject<SettingInfo>(1);
  settingsLoaded: Observable<SettingInfo>;

  constructor(private formBuilder: FormBuilder,
              private appService: AppService,
              private settingsService: SettingsService,
              private busyService: BusyService) {

    this.settingsLoaded = this.settingsReplaySubject.asObservable();
  }


  ngOnInit(): void {
    this.busyService.start();
    this.loadMarkers();
  }

  /**
   * Load the existing markers from file
   * @private
   */
  private loadMarkers(): void {
    this.settingsService.getConfigurations().subscribe({
      next: (settings) => {
        this.originalSettings = settings;
        this.settingsReplaySubject.next(settings);
        this.busyService.stop();
      },
      error: () => {
        this.busyService.stop();
      }
    });
  }


  saveSettings(updatedSettings: SettingInfo): Observable<SettingInfo> {
    this.busyService.start();
    return new Observable<any>((subscriber) => {
      this.settingsService.saveConfigurations(updatedSettings).subscribe({
        next: (settings) => {
          this.originalSettings = settings;

          this.busyService.stop();
          this.appService.openSnackBar(true, 'Settings updated');
          this.settingsReplaySubject.next(settings);
          subscriber.next(settings);
          subscriber.complete();
        },
        error: (error) => {
          this.busyService.stop();
          subscriber.error(error);
          subscriber.complete();
        }
      });
    });
  }

}
