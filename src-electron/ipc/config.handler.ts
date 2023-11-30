import {readFile, writeFile} from 'fs/promises';
import {CONFIG_DIR, CONFIG_FILE} from '../constants';
import {isJson} from '../utils';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {IpcMainInvokeEvent} from 'electron';

export function getConfig(): Promise<SettingInfo> {
  return readFile(CONFIG_DIR + CONFIG_FILE).then((data) => {
    if (!isJson(data)) {
      return Promise.reject(`Corrupt configuration files at "${CONFIG_DIR}${CONFIG_FILE}"`);
    }

    return JSON.parse(data.toString());
  });
}


export function updateConfig(event: IpcMainInvokeEvent, config: SettingInfo): Promise<SettingInfo> {
  return updateConfigFile(config);
}

export function updateConfigFile(config: SettingInfo): Promise<SettingInfo> {
  return writeFile(CONFIG_DIR + CONFIG_FILE, JSON.stringify(config))
    .then(() => config);
}
