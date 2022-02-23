import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {ConfigServiceIpc} from '@shared/ipc/config-service-ipc';
import {fromIpcResponse} from './ipc.utils';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private configApi: ConfigServiceIpc;

  constructor() {
    this.configApi = (window as any).configApi;
  }

  saveConfigurations(settings: SettingInfo): Observable<SettingInfo> {
    return fromIpcResponse(this.configApi.updateConfig(settings));
  }

  getConfigurations(): Observable<SettingInfo> {
    return fromIpcResponse(this.configApi.getConfig());
  }
}
