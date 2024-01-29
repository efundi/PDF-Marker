import {readFile, writeFile} from 'fs/promises';
import {CONFIG_DIR, CONFIG_FILE} from '../constants';
import {isJson} from '../utils';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {IpcMainInvokeEvent} from 'electron';
import {cloneDeep} from "lodash";

const logger = require('electron-log');
const LOG = logger.scope('ConfigHandler');

export function getConfig(): Promise<SettingInfo> {
  LOG.debug("Loading settings " + CONFIG_DIR + CONFIG_FILE)
  return readFile(CONFIG_DIR + CONFIG_FILE).then((data) => {


    if (!isJson(data)) {
      LOG.debug("Loading settings failed")
      return Promise.reject(`Corrupt configuration files at "${CONFIG_DIR}${CONFIG_FILE}"`);
    }
    const json = data.toString()
    LOG.debug("Loaded settings: ", json)
    return JSON.parse(json);
  });
}


export function updateConfig(event: IpcMainInvokeEvent, config: SettingInfo): Promise<SettingInfo> {
  return updateConfigFile(config);
}

export function updateConfigFile(config: SettingInfo): Promise<SettingInfo> {
  const data = JSON.stringify(config)
  LOG.debug("Updating settings " + CONFIG_DIR + CONFIG_FILE, data)
  return writeFile(CONFIG_DIR + CONFIG_FILE, JSON.stringify(config))
    .then(() => {
      LOG.debug("Updated settings", data)
      return cloneDeep(config)
    });
}
