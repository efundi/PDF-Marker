import {readFile, writeFile} from 'fs/promises';
import {CONFIG_DIR, CONFIG_FILE} from '../constants';
import {isJson} from '../utils';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {IpcMainInvokeEvent} from 'electron';
import {migrateAssignmentSettings} from '../migration/assignment.migration';
import {migrateMarks} from '../migration/marks.migration';

export function getConfig(): Promise<SettingInfo> {
  return readFile(CONFIG_DIR + CONFIG_FILE).then((data) => {
    if (!isJson(data)) {
      return Promise.reject(`Corrupt configuration files at "${CONFIG_DIR}${CONFIG_FILE}"`);
    }

    return JSON.parse(data.toString());
  });
}


export function updateConfig(event: IpcMainInvokeEvent, config: SettingInfo): Promise<SettingInfo> {

  return getConfig().then((originalConfig) => {
    const needMigration = originalConfig.defaultPath !== config.defaultPath;
    let promise = updateConfigFile(config);
    if (needMigration) {
      // If the default directory changed, we need to check that the migrations are being run
      promise = promise.then((updatedConfig) => {
        return migrateAssignmentSettings()
          .then(migrateMarks)
          .then(() => updatedConfig);
      });
    }

    return promise;
  });
}

export function updateConfigFile(config: SettingInfo): Promise<SettingInfo> {
  return  writeFile(CONFIG_DIR + CONFIG_FILE, JSON.stringify(config))
    .then(() => config);
}
