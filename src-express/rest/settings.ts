import {checkAccess, checkClient, isJson, readFromFile, sendResponse, sendResponseData, writeToFile} from '../utils';
import {CONFIG_DIR, CONFIG_FILE, COULD_NOT_CREATE_CONFIG_DIRECTORY, FORBIDDEN_RESOURCE} from '../constants';
import {existsSync, mkdir} from 'fs';
import {validationResult} from 'express-validator';

export const settingsGet = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (!existsSync(CONFIG_DIR)) {
    mkdir(CONFIG_DIR, err => {
      if (err) {
        return sendResponse(req, res, 500, COULD_NOT_CREATE_CONFIG_DIRECTORY);
      }
      return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
        if (!isJson(data)) {
          return sendResponseData(req, res, 200, {});
        } else {
          return sendResponseData(req, res, 200, data.toString());
        }
      });
    });
  } else {
    return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
      if (!isJson(data)) {
        return sendResponseData(req, res, 200, {});
      } else {
        return sendResponseData(req, res, 200, data.toString());
      }
    });
  }
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
