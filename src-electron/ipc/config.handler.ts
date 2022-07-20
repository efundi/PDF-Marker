import {mkdir, readFile, writeFile} from 'fs/promises';
import {COMMENTS_FILE, CONFIG_DIR, CONFIG_FILE} from '../constants';
import {isJson} from '../utils';
import {existsSync} from 'fs';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {IpcMainInvokeEvent} from 'electron';

export function ensureConfigDirectory(): Promise<string> {
  if (!existsSync(CONFIG_DIR)) {
    return mkdir(CONFIG_DIR)
      .then(() => ensureConfigFile())
      .then(() => CONFIG_DIR);
  } else {
    return ensureConfigFile().then(() => CONFIG_DIR);
  }
}

function ensureConfigFile(): Promise<string> {
  if (existsSync(CONFIG_DIR + CONFIG_FILE)) {
    return Promise.resolve(CONFIG_DIR + CONFIG_FILE);
  } else {
    return writeFile(CONFIG_DIR + CONFIG_FILE, '{}')
      .then(() => CONFIG_DIR + CONFIG_FILE);
  }
}

export function getConfig(): Promise<SettingInfo> {
  return ensureConfigDirectory().then(() => {
    return readFile(CONFIG_DIR + CONFIG_FILE).then((data) => {
      if (!isJson(data)) {
        return Promise.reject(`Corrupt configuration files at "${CONFIG_DIR}${CONFIG_FILE}"`);
      }

      return JSON.parse(data.toString());
    });
  });
}

export function updateConfig(event: IpcMainInvokeEvent, config: SettingInfo): Promise<SettingInfo> {
  return updateConfigFile(config);
}

export function updateConfigFile(config: SettingInfo): Promise<SettingInfo> {
  return ensureConfigDirectory().then(() => {
    return writeFile(CONFIG_DIR + CONFIG_FILE, JSON.stringify(config))
      .then(() => config);
  });
}
