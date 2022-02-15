import {checkAccess, checkClient, isJson, readFromFile, sendResponse, sendResponseData, writeToFile} from '../utils';
import {CONFIG_DIR, CONFIG_FILE, COULD_NOT_CREATE_CONFIG_DIRECTORY, FORBIDDEN_RESOURCE} from '../constants';
import {mkdir, readFile} from 'fs/promises';
import {existsSync} from 'fs';
import {validationResult} from 'express-validator';
import {noop} from 'lodash';

export const settingsGet = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  let promise: Promise<any> = Promise.resolve();

  if (!existsSync(CONFIG_DIR)) {
    promise = mkdir(CONFIG_DIR)
      .then(noop, () => {
        return Promise.reject(COULD_NOT_CREATE_CONFIG_DIRECTORY);
      });
  }

  promise
    .then(() => {
      return readFile(CONFIG_DIR + CONFIG_FILE)
        .then(data => data, error => Promise.reject(error.message));
    })
    .then((configBuffer) => {
      if (!isJson(configBuffer)) {
        return sendResponseData(req, res, 200, {});
      } else {
        return sendResponseData(req, res, 200, configBuffer.toString());
      }
    }, (error) => {
      return sendResponse(req, res, 500, error);
    });

};

export const settingsPost = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  return checkAccess(req, res, req.body.defaultPath, () => {
    const data = new Uint8Array(Buffer.from(JSON.stringify(req.body)));
    return writeToFile(req, res, CONFIG_DIR + CONFIG_FILE, data);
  });
};
