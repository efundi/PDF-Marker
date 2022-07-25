import {Injectable, NgZone} from '@angular/core';
import {Observable} from 'rxjs';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {ConfigIpcService} from '@shared/ipc/config.ipc-service';
import {fromIpcResponse} from './ipc.utils';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private configApi: ConfigIpcService;

  constructor(private ngZone: NgZone) {
    this.configApi = (window as any).configApi;
  }

  saveConfigurations(settings: SettingInfo): Observable<SettingInfo> {
    return fromIpcResponse(this.configApi.updateConfig(settings));
  }

  getConfigurations(): Observable<SettingInfo> {
    return fromIpcResponse(this.configApi.getConfig());
  }
}
