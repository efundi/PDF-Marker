import {readFile} from 'fs/promises';
import {CONFIG_FILE, CONFIG_DIR, NOT_CONFIGURED_CONFIG_DIRECTORY} from '../../constants';
import {isJson} from '../../utils';


export function getConfig(): Promise<any> {
  return readFile(CONFIG_DIR + CONFIG_FILE).then((data) => {
    if (!isJson(data)) {
      return Promise.reject(NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    return JSON.parse(data.toString());
  });
}
