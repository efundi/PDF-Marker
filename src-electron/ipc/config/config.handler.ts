import {mkdir, readFile, writeFile} from 'fs/promises';
import {CONFIG_DIR, CONFIG_FILE, NOT_CONFIGURED_CONFIG_DIRECTORY} from '../../constants';
import {isJson} from '../../utils';
import {existsSync} from 'fs';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {IpcMainInvokeEvent} from 'electron';

export function ensureConfigDirectory(): Promise<string> {
  let promise = Promise.resolve();
  if (!existsSync(CONFIG_DIR)) {
    promise = mkdir(CONFIG_DIR);
  }
  return promise.then(() => CONFIG_DIR);
}

export function getConfig(): Promise<SettingInfo> {
  return readFile(CONFIG_DIR + CONFIG_FILE).then((data) => {
    if (!isJson(data)) {
      return Promise.reject(NOT_CONFIGURED_CONFIG_DIRECTORY);
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
