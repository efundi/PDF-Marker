import {Injectable, NgZone} from '@angular/core';
import {Observable, tap, throwError} from 'rxjs';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {ConfigIpcService} from '@shared/ipc/config.ipc-service';
import {fromIpcResponse} from './ipc.utils';
import {createLogger, Logger} from "../utils/logging";
import {catchError} from "rxjs/operators";

const LOG: Logger = createLogger("SettingsService")
@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private configApi: ConfigIpcService;

  constructor(private ngZone: NgZone) {
    this.configApi = (window as any).configApi;
  }

  saveConfigurations(settings: SettingInfo): Observable<SettingInfo> {
    LOG.debug("Updating settings", settings)
    return fromIpcResponse(this.configApi.updateConfig(settings))
      .pipe(
        catchError((error) => {
          LOG.error("Update settings error", error)
          return throwError(() => error)
        }),
        tap((updatedSettings) => {
          LOG.debug("Updated settings", updatedSettings)
        })
      );
  }

  getConfigurations(): Observable<SettingInfo> {
    LOG.debug("Loading settings")
    return fromIpcResponse(this.configApi.getConfig())
      .pipe(
        catchError((error) => {
          LOG.error("Load settings error", error)
          return throwError(() => error)
        }),
        tap((settings) => {
          LOG.debug("Loaded settings", settings)
        })
      );
  }
}
