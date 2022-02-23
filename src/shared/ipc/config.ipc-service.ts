import {IpcResponse} from "./ipc-response";
import {SettingInfo} from "../info-objects/setting.info";

export interface ConfigIpcService {

  getConfig(): Promise<IpcResponse<SettingInfo>>;

  updateConfig(config: SettingInfo): Promise<IpcResponse<SettingInfo>>;
}
