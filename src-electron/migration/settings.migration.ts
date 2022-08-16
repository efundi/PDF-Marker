import {DefaultSettings, SettingInfo, SettingInfoVersion} from '@shared/info-objects/setting.info';
import {getConfig, updateConfigFile} from '../ipc/config.handler';
import {mkdir, writeFile} from 'fs/promises';
import {CONFIG_DIR, CONFIG_FILE} from '../constants';
import {existsSync} from 'fs';
import {uuidv4} from '@shared/constants/constants';

const logger = require('electron-log');
const LOG = logger.scope('SettingsMigration');

export function runSettingsMigration(): Promise<any> {
  LOG.info('Running settings migration');

  return ensureConfigDirectory()
    .then(ensureConfigFile)
    .then(getConfig)
    .then(
      (settings) => upgradeSettings(settings),
      (error) => LOG.error(error)
    );

}

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
    return writeFile(CONFIG_DIR + CONFIG_FILE, JSON.stringify(DefaultSettings))
      .then(() => CONFIG_DIR + CONFIG_FILE);
  }
}

/**
 * Upgrade settings if required
 * @param settings
 */
function upgradeSettings(settings: SettingInfo): Promise<SettingInfo> {
  let promise: Promise<SettingInfo> = Promise.resolve(settings);
  if (settings.version !== SettingInfoVersion) {

    if (!settings.hasOwnProperty('version')) {
      LOG.info('Performing migration to version 1');
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
  } else {
    LOG.debug(CONFIG_FILE + ' already on correct version');
  }
  return promise.then((migratedSettings) => {
    LOG.debug('Migration done');
    return migratedSettings;
  });
}
