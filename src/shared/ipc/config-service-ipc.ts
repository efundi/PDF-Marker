import {IpcResponse} from "./ipc-response";
import {SettingInfo} from "../info-objects/setting.info";

export interface ConfigServiceIpc {

  getConfig(): Promise<IpcResponse<SettingInfo>>;

  updateConfig(config: SettingInfo): Promise<IpcResponse<SettingInfo>>;
}
