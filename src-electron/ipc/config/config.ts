import {mkdir, readFile, writeFile} from 'fs/promises';
import {CONFIG_FILE, CONFIG_DIR, NOT_CONFIGURED_CONFIG_DIRECTORY} from '../../constants';
import {isJson} from '../../utils';
import {existsSync} from "fs";

export function ensureConfigDirectory(): Promise<string>{
  let promise = Promise.resolve();
  if (!existsSync(CONFIG_DIR)) {
    promise = mkdir(CONFIG_DIR);
  }
  return promise.then(() => CONFIG_DIR);
}

export function getConfig(): Promise<any> {
  return readFile(CONFIG_DIR + CONFIG_FILE).then((data) => {
    if (!isJson(data)) {
      return Promise.reject(NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    return JSON.parse(data.toString());
  });
}

export function updateConfig(config: any): Promise<any>{
  return writeFile(CONFIG_DIR + CONFIG_FILE, JSON.stringify(config))
    .then(() => config);
}
