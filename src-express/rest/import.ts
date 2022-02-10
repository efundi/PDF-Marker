import {
  checkClient,
  deleteFolderRecursive,
  extractZipFile,
  isFolder,
  isJson,
  isNullOrUndefined,
  readFromFile,
  sendResponse,
  writeToFile
} from '../utils';
import {IRubric} from '../../src/app/modules/application/core/utils/rubric.class';
import {
  CONFIG_DIR, CONFIG_FILE,
  COULD_NOT_READ_RUBRIC_LIST, EXTRACTED_ZIP, EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC, FORBIDDEN_RESOURCE,
  INVALID_RUBRIC_JSON_FILE, NOT_CONFIGURED_CONFIG_DIRECTORY,
  NOT_PROVIDED_RUBRIC,
  RUBRICS_FILE, SETTING_FILE
} from '../constants';
import {existsSync, readFileSync} from 'fs';
import * as glob from 'glob';
import {AssignmentSettingsInfo} from '../../src/app/modules/pdf-marker/info-objects/assignment-settings.info';
import {sep} from 'path';
import * as JSZip from 'jszip';
import * as pathinfo from 'locutus/php/filesystem/pathinfo';


const zipFileUploadCallback = (req, res, data) => {
  const acceptedParams = ['file', 'workspace', 'assignmentName', 'noRubric', 'rubric', 'assignmentType'];
  const receivedParams = Object.keys(req.body);
  let isInvalidKey = false;
  let invalidParam: string;

  for (const receivedParam of receivedParams) {
    if (acceptedParams.indexOf(receivedParam) === -1) {
      isInvalidKey = true;
      invalidParam = receivedParam;
      break;
    }
  }

  if (isInvalidKey) {
    return sendResponse(req, res, 400, `Invalid parameter ${invalidParam} found in request`);
  }

  if (isNullOrUndefined(req.body.file)) {
    return sendResponse(req, res, 400, 'No file selected!');
  }

  return readFromFile(req, res, req.body.file, (zipFile) => {
    const config = JSON.parse(data.toString());

    const isRubric: boolean = req.body.noRubric;
    let rubricName: string;
    let rubric: IRubric = null;
    let rubricIndex: number;
    let rubrics: IRubric[];

    if (!isRubric) {
      if (isNullOrUndefined(req.body.rubric)) {
        return sendResponse(req, res, 400, NOT_PROVIDED_RUBRIC);
      }

      rubricName = req.body.rubric.trim();
      if (!isNullOrUndefined(rubricName)) {
        try {
          const rubricData = readFileSync(CONFIG_DIR + RUBRICS_FILE);

          if (!isJson(rubricData)) {
            return sendResponse(req, res, 400, INVALID_RUBRIC_JSON_FILE);
          }

          rubrics = JSON.parse(rubricData.toString());

          if (Array.isArray(rubrics)) {
            let index = -1;
            for (let i = 0; i < rubrics.length; i++) {
              if (rubrics[i].name === rubricName) {
                index = i;
                break;
              }
            }

            if (index !== -1) {
              rubric = rubrics[index];
              rubricIndex = index;
            }
          } else {
            return sendResponse(req, res, 400, COULD_NOT_READ_RUBRIC_LIST);
          }
        } catch (e) {
          return sendResponse(req, res, 500, e.message);
        }
      }
    }

    const folders = glob.sync(config.defaultPath + '/*');

    let folderCount = 0;
    folders.forEach(folder => {
      if (isFolder(folder)) {
        folders[folderCount] = pathinfo(folder, 'PATHINFO_BASENAME');
        folderCount++;
      }
    });

    const zip = new JSZip();
    return zip.loadAsync(new Uint8Array(zipFile))
      .then(async (zipObject) => {
        let entry = '';
        zipObject.forEach((relativePath, zipEntry) => {
          if (entry === '') {
            entry = zipEntry.name;
          }
        });
        console.log('entry: ' + entry);
        const entryPath = entry.split('/');
        console.log('entryPath: ' + entryPath);
        if (entryPath.length > 0) {
          let newFolder;
          const oldPath = entryPath[0];
          let foundCount = 0;
          for (let i = 0; i < folders.length; i++) {
            if (oldPath.toLowerCase() + '/' === folders[i].toLowerCase() + '/') {
              foundCount++;
            } else if ((oldPath.toLowerCase() + ' (' + (foundCount + 1) + ')' + '/') === folders[i].toLowerCase() + '/') {
              foundCount++;
            }
          }

          const settings: AssignmentSettingsInfo = {defaultColour: '#6f327a', rubric, isCreated: false};
          if (foundCount !== 0) {
            newFolder = oldPath + ' (' + (foundCount + 1) + ')' + '/';

            if (req.body.workspace === 'Default Workspace' || req.body.workspace === null || req.body.workspace === 'null') {
              extractZipFile(req.body.file, config.defaultPath + sep, newFolder + sep, oldPath + '/', req.body.assignmentName, req.body.assignmentType).then(() => {
                return writeToFile(req, res, config.defaultPath + sep + newFolder + sep + SETTING_FILE, JSON.stringify(settings),
                  EXTRACTED_ZIP,
                  null, () => {
                    if (!isNullOrUndefined(rubricName)) {
                      rubrics[rubricIndex].inUse = true;
                      return writeToFile(req, res, CONFIG_DIR + RUBRICS_FILE, JSON.stringify(rubrics),
                        EXTRACTED_ZIP,
                        EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC, null);
                    }
                    return sendResponse(req, res, 200, EXTRACTED_ZIP);
                  });
              }).catch((error) => {
                if (existsSync(config.defaultPath + sep + newFolder)) {
                  deleteFolderRecursive(config.defaultPath + sep + newFolder);
                }
                return sendResponse(req, res, 501, error.message);
              });
            } else {
              extractZipFile(req.body.file, config.defaultPath + sep + req.body.workspace + sep, newFolder + sep, oldPath + '/', req.body.assignmentName, req.body.assignmentType).then(() => {
                return writeToFile(req, res, config.defaultPath + sep + req.body.workspace + sep + newFolder + sep + SETTING_FILE, JSON.stringify(settings),
                  EXTRACTED_ZIP,
                  null, () => {
                    if (!isNullOrUndefined(rubricName)) {
                      rubrics[rubricIndex].inUse = true;
                      return writeToFile(req, res, CONFIG_DIR + RUBRICS_FILE, JSON.stringify(rubrics),
                        EXTRACTED_ZIP,
                        EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC, null);
                    }
                    return sendResponse(req, res, 200, EXTRACTED_ZIP);
                  });
              }).catch((error) => {
                if (existsSync(config.defaultPath + sep + newFolder)) {
                  deleteFolderRecursive(config.defaultPath + sep + newFolder);
                }
                return sendResponse(req, res, 501, error.message);
              });
            }
          } else {
            if (req.body.workspace === 'Default Workspace' || req.body.workspace === null || req.body.workspace === 'null') {
              extractZipFile(req.body.file, config.defaultPath + sep, '', '', req.body.assignmentName, req.body.assignmentType)
                .then(async () => {
                  return writeToFile(req, res, config.defaultPath + sep + oldPath + sep + SETTING_FILE, JSON.stringify(settings),
                    EXTRACTED_ZIP,
                    null, () => {
                      if (!isNullOrUndefined(rubricName)) {
                        rubrics[rubricIndex].inUse = true;
                        return writeToFile(req, res, CONFIG_DIR + RUBRICS_FILE, JSON.stringify(rubrics),
                          EXTRACTED_ZIP,
                          EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC, null);
                      }
                      return sendResponse(req, res, 200, EXTRACTED_ZIP);
                    });
                }).catch((error) => {
                if (existsSync(config.defaultPath + sep + oldPath)) {
                  deleteFolderRecursive(config.defaultPath + sep + oldPath);
                }
                return sendResponse(req, res, 501, error.message);
              });
            } else {
              extractZipFile(req.body.file, config.defaultPath + sep + req.body.workspace + sep, '', '', req.body.assignmentName, req.body.assignmentType).then(() => {
                return writeToFile(req, res, config.defaultPath + sep + req.body.workspace + sep + oldPath + sep + SETTING_FILE, JSON.stringify(settings),
                  EXTRACTED_ZIP,
                  null, () => {
                    if (!isNullOrUndefined(rubricName)) {
                      rubrics[rubricIndex].inUse = true;
                      return writeToFile(req, res, CONFIG_DIR + RUBRICS_FILE, JSON.stringify(rubrics),
                        EXTRACTED_ZIP,
                        EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC, null);
                    }
                    return sendResponse(req, res, 200, EXTRACTED_ZIP);
                  });
              }).catch((error) => {
                if (existsSync(config.defaultPath + sep + newFolder)) {
                  deleteFolderRecursive(config.defaultPath + sep + newFolder);
                }
                return sendResponse(req, res, 501, error.message);
              });
            }
          }
        } else {
          return sendResponse(req, res, 501, 'Zip Object contains no entries!');
        }
      })
      .catch(error => {
        return sendResponse(req, res, 501, error.message);
      });
  }, 'File not uploaded!');
};

export const importFn = (req, res, next) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    return zipFileUploadCallback(req, res, data);
    /*return uploadFile(req, res, (err) => {
      return zipFileUploadCallback(req, res, data, err);
    });*/
  });
};
