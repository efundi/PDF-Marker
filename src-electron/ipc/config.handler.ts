import {mkdir, readFile, writeFile} from 'fs/promises';
import {CONFIG_DIR, CONFIG_FILE} from '../constants';
import {isJson} from '../utils';
import {existsSync} from 'fs';
import {SettingInfo, SettingInfoVersion} from '@shared/info-objects/setting.info';
import {IpcMainInvokeEvent} from 'electron';
import {uuidv4} from '../../src/app/utils/utils';

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
  }).then(settings => upgradeSettings(settings));
}

/**
 * Upgrade settings if required
 * @param settings
 */
function upgradeSettings(settings: SettingInfo): Promise<SettingInfo> {
  let promise: Promise<SettingInfo> = Promise.resolve(settings);
  if (settings.version !== SettingInfoVersion) {

    if (!settings.hasOwnProperty('version')) {
      // This is the first upgrade, set all the new fields
      settings.version = 1;
      settings.user = {
        id: uuidv4()
      };
      settings.markers = settings.markers || [];
      settings.groups = settings.groups || [];
      settings.groupMembers = settings.groupMembers || [];
      promise = updateConfigFile(settings);
    }

    /*
       if (settings.version === 1) {
         // Convert to from v 1 to version 2
         settings = settingsV2;
         promise = promise.then(() => updateConfigFile(settings));
       }

       if (settings.version === 2) {
         // Convert to from v 2 to version 3
         settings = sSettingsV3;
         promise = promise.then(() => updateConfigFile(settings));
       }
     */
  }
  return promise;
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
