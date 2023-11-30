import {DefaultSettings, SettingInfo, SettingInfoVersion} from '@shared/info-objects/setting.info';
import {getConfig, updateConfigFile} from '../ipc/config.handler';
import {mkdir, writeFile, cp, rm} from 'fs/promises';
import {CONFIG_DIR, CONFIG_FILE, WORKSPACE_DIR} from '../constants';
import {existsSync} from 'fs';
import {uuidv4} from '@shared/constants/constants';
import {basename} from 'path';
import {findLibreOfficePath} from '../ipc/convert.handler';
import {noop} from 'lodash';
import {isNullOrUndefinedOrEmpty} from "../utils";

const logger = require('electron-log');
const LOG = logger.scope('SettingsMigration');

export function runSettingsMigration(): Promise<any> {
  LOG.info('Running settings migration');

  return ensureConfigDirectory()
    .then(ensureWorkspaceDirectory)
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
export function ensureWorkspaceDirectory(): Promise<string> {
  if (!existsSync(WORKSPACE_DIR)) {
    return mkdir(WORKSPACE_DIR)
      .then(() => WORKSPACE_DIR)
  } else {
    return Promise.resolve(WORKSPACE_DIR);
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

function migrateWorkspace(settings: any): Promise<any>{
  LOG.info('Moving workspace');
  return cp(settings.defaultPath, WORKSPACE_DIR, {force: true, recursive: true, preserveTimestamps: true})
    .then(() => rm(settings.defaultPath, {force: true, recursive: true}));
}

/**
 * Upgrade settings if required
 * @param settings
 */
function upgradeSettings(settings: SettingInfo): Promise<SettingInfo> {
  let promise: Promise<SettingInfo> = Promise.resolve(settings);
  if (settings.version !== SettingInfoVersion) {

    if (!settings.hasOwnProperty('version')) {
      settings.version = 0; // Simulate version 0
      LOG.info('Performing migration to version 1');
      // This is the first upgrade, set all the new fields
      settings.version = 1;
      settings.user = {
        id: uuidv4()
      };
      settings.markers = settings.markers || [];
      settings.groups = settings.groups || [];
      settings.groupMembers = settings.groupMembers || [];
      settings.folders = (settings.folders || []).map((folder) => basename(folder));
      promise = updateConfigFile(settings);
    }

    // Upgrade settings to v2
    if (settings.version < 2) {
      promise = promise.then(() => {
        LOG.info('Performing migration to version 2');
        // Convert to from v 1 to version 2
        const v2Settings: any = {
          ...settings,
          version: 2,
          libreOfficePath: null
        };
        return findLibreOfficePath()
          .then((path) => {
            v2Settings.libreOfficePath = path;
          }, noop)
          .then(() => updateConfigFile(v2Settings));
      });
    }

    // Upgrade settings to v3
    if (settings.version < 3) {
      // Convert to from v 2 to version 3
      promise = promise.then((settings) => {
        LOG.info('Performing migration to version 3');
        const v3Settings: any = {
          ...settings,
          version: 3,
        };
        delete v3Settings.defaultPath;
        // if defaultPath is not set or empty, there is nothing migrate
        if (isNullOrUndefinedOrEmpty((settings as any).defaultPath)){
          LOG.info('Settings default path was not configured, not migrating any workspaces');
          return updateConfigFile(v3Settings);
        } else {
          return migrateWorkspace(settings)
            .then(_ => updateConfigFile(v3Settings))
        }
      });
    }

    // Upgrade settings to v4
    // if (settings.version < 4) {
    //   // Convert to from v 3 to version 4
    //   promise = promise.then((settings) => {
    //     const v3Settings = {...settings};
    //     return updateConfigFile(v3Settings)
    //   });
    // }
    return promise;
  } else {
    LOG.debug(CONFIG_FILE + ' already on correct version');
  }
  return promise.then((migratedSettings) => {
    LOG.debug('Migration done');
    return migratedSettings;
  });
}
