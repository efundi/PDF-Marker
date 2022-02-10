import {
  checkAccess,
  checkClient,
  isJson,
  readFromFile,
  sendResponse,
  sendResponseData,
  uploadFile,
  writeToFile
} from '../utils';
import {existsSync, mkdir, readFile, readFileSync, unlinkSync, writeFile} from 'fs';
import {
  CONFIG_DIR,
  CONFIG_FILE,
  COULD_NOT_CREATE_CONFIG_DIRECTORY,
  COULD_NOT_CREATE_RUBRIC_FILE,
  COULD_NOT_READ_RUBRIC_LIST,
  FORBIDDEN_RESOURCE, GRADES_FILE,
  INVALID_RUBRIC_JSON_FILE, MARK_FILE,
  NOT_CONFIGURED_CONFIG_DIRECTORY,
  NOT_PROVIDED_ASSIGNMENT_LOCATION,
  NOT_PROVIDED_RUBRIC,
  RUBRICS_FILE,
  SETTING_FILE,
  UPLOADS_DIR
} from '../constants';
import {sep} from 'path';
import {IRubric, IRubricName} from '../../src/app/modules/application/core/utils/rubric.class';
import * as glob from 'glob';
import {AssignmentSettingsInfo} from '../../src/app/modules/pdf-marker/info-objects/assignment-settings.info';
import * as csvtojson from 'csvtojson';
import {json2csv} from 'json-2-csv';

const rubricFileUpload = (req, res, err) => {

  if (err) {
    return sendResponseData(req, res, 501, {error: err});
  }

  if (!req.file) {
    return sendResponse(req, res, 404, 'No file uploaded!');
  }

  const mimeTypes = ['application/json'];

  const rubricName = req.body.rubricName.trim();

  if (mimeTypes.indexOf(req.file.mimetype) === -1) {
    return sendResponse(req, res, 400, 'Not a valid JSON file. Please select a file with a .json extension!');
  }

  return readFile(UPLOADS_DIR + sep + req.file.originalname, (err, data) => {
    if (err) {
      return sendResponse(req, res, 500, COULD_NOT_CREATE_RUBRIC_FILE);
    }

    if (!isJson(data)) {
      return sendResponse(req, res, 400, INVALID_RUBRIC_JSON_FILE);
    }

    const uploadedRubric: IRubric = JSON.parse(data.toString());
    // Read file contents of rubricFiles, if file does not exist, create one.
    // If file exists, get file contents, then append to it.
    if (!existsSync(CONFIG_DIR)) {
      mkdir(CONFIG_DIR, err => {
        if (err) {
          return sendResponse(req, res, 500, COULD_NOT_CREATE_CONFIG_DIRECTORY);
        }

        uploadedRubric.name = rubricName;
        return writeRubricFile(req, res, [uploadedRubric]);
      });
    } else {
      if (existsSync(CONFIG_DIR + RUBRICS_FILE)) {
        return readFile(CONFIG_DIR + RUBRICS_FILE, (err, data) => {
          if (err) {
            return sendResponse(req, res, 500, 'Failed to read file containing list of rubrics!');
          }

          if (!isJson(data)) {
            return sendResponse(req, res, 400, INVALID_RUBRIC_JSON_FILE);
          }

          const rubrics: IRubric[] = JSON.parse(data.toString());
          if (Array.isArray(rubrics)) {
            let foundCount = 0;

            const clonedRubrics = [...rubrics];
            clonedRubrics.sort((a, b) => (a.name > b.name) ? 1 : -1);

            for (let i = 0; i < clonedRubrics.length; i++) {
              if (clonedRubrics[i].name.toLowerCase() === rubricName.toLowerCase()) {
                foundCount++;
              } else if (clonedRubrics[i].name.toLowerCase() === (rubricName.toLowerCase() + ' (' + (foundCount + 1) + ')')) {
                foundCount++;
              }
            }

            if (foundCount !== 0) {
              uploadedRubric.name = rubricName + ' (' + (foundCount + 1) + ')';
            } else {
              uploadedRubric.name = rubricName;
            }

            rubrics.unshift(uploadedRubric);
            return writeRubricFile(req, res, rubrics);
          }

          return sendResponse(req, res, 400, COULD_NOT_READ_RUBRIC_LIST);
        });
      } else {
        uploadedRubric.name = rubricName;
        return writeRubricFile(req, res, [uploadedRubric]);
      }
    }
  });
};


const writeRubricFile = (req, res, rubricData: IRubric[]) => {
  return writeFile(CONFIG_DIR + RUBRICS_FILE, JSON.stringify(rubricData), (err) => {
    if (err) {
      return sendResponse(req, res, 500, COULD_NOT_CREATE_RUBRIC_FILE);
    }

    return getRubricNames(req, res, rubricData);
  });
};

const getRubricNames = (req, res, rubrics: IRubric[]) => {
  const rubricNames: IRubricName[] = [];
  if (Array.isArray(rubrics)) {
    rubrics.forEach(rubric => {
      const rubricName = {name: rubric.name, inUse: (rubric.inUse) ? rubric.inUse : false};
      rubricNames.push(rubricName);
    });
    return sendResponseData(req, res, 200, rubricNames);
  }

  return writeRubricFile(req, res, []);
};

export const rubricUploadFn = async (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  return uploadFile(req, res, (err) => {
    if (err) {
      return sendResponse(req, res, 500, 'Error uploading rubric file');
    }

    rubricFileUpload(req, res, err);
  });
};



export const getRubricsFn = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (!existsSync(CONFIG_DIR)) {
    return mkdir(CONFIG_DIR, err => {
      if (err) {
        return sendResponse(req, res, 500, COULD_NOT_CREATE_CONFIG_DIRECTORY);
      }

      return writeRubricFile(req, res, []);
    });
  } else {
    if (existsSync(CONFIG_DIR + RUBRICS_FILE)) {
      return readFromFile(req, res, CONFIG_DIR + RUBRICS_FILE, (data) => {
        if (!isJson(data)) {
          return sendResponse(req, res, 400, INVALID_RUBRIC_JSON_FILE);
        }

        const rubrics: IRubric[] = JSON.parse(data.toString());
        if (Array.isArray(rubrics)) {
          return sendResponseData(req, res, 200, rubrics);
        }
        return writeRubricFile(req, res, []);
      });
    } else {
      return writeRubricFile(req, res, []);
    }
  }
};



export const getRubricNamesFn = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (!existsSync(CONFIG_DIR)) {
    return mkdir(CONFIG_DIR, err => {
      if (err) {
        return sendResponse(req, res, 500, COULD_NOT_CREATE_CONFIG_DIRECTORY);
      }

      return writeRubricFile(req, res, []);
    });
  } else {
    if (existsSync(CONFIG_DIR + RUBRICS_FILE)) {
      return readFromFile(req, res, CONFIG_DIR + RUBRICS_FILE, (data) => {
        if (!isJson(data)) {
          return sendResponse(req, res, 400, INVALID_RUBRIC_JSON_FILE);
        }

        const rubrics: IRubric[] = JSON.parse(data.toString());
        return getRubricNames(req, res, rubrics);
      });
    } else {
      return writeRubricFile(req, res, []);
    }
  }
};



export const deleteRubricsFn = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (!req.body.rubricName) {
    return sendResponse(req, res, 400, NOT_PROVIDED_RUBRIC);
  }

  const rubricName: string = req.body.rubricName.trim();

  return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    const config = JSON.parse(data.toString());

    try {
      const folders: string[] = glob.sync(config.defaultPath + sep + '*');
      let found = false;
      folders.forEach(folder => {
        const settingFileContents = existsSync(folder + sep + SETTING_FILE) ? readFileSync(folder + sep + SETTING_FILE) : null;
        if (settingFileContents != null) {
          if (!isJson(settingFileContents)) {
            return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
          }
          const settings: AssignmentSettingsInfo = JSON.parse(settingFileContents.toString());

          if (settings.rubric && settings.rubric.name.toLowerCase() === rubricName.toLowerCase()) {
            found = true;
          }
        }
      });

      return sendResponseData(req, res, 200, found);
    } catch (e) {
      return sendResponse(req, res, 500, e.message);
    }
  });
};



export const deleteRubricConfirmation = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (!req.body.rubricName) {
    return sendResponse(req, res, 400, NOT_PROVIDED_RUBRIC);
  }

  if (!req.body.confirmation) {
    return sendResponse(req, res, 400, FORBIDDEN_RESOURCE);
  }

  const rubricName: string = req.body.rubricName.trim();

  if (existsSync(CONFIG_DIR + RUBRICS_FILE)) {
    return readFromFile(req, res, CONFIG_DIR + RUBRICS_FILE, (data) => {
      if (!isJson(data)) {
        return sendResponse(req, res, 400, INVALID_RUBRIC_JSON_FILE);
      }

      const rubrics: IRubric[] = JSON.parse(data.toString());
      if (Array.isArray(rubrics)) {
        let indexFound = -1;

        for (let i = 0; i < rubrics.length; i++) {
          if (rubrics[i].name.toLowerCase() === rubricName.toLowerCase()) {
            indexFound = i;
            break;
          }
        }

        if (indexFound === -1) {
          return sendResponse(req, res, 404, 'Could not find rubric');
        } else {
          rubrics.splice(indexFound, 1);
        }

        return writeRubricFile(req, res, rubrics);
      }
      return sendResponse(req, res, 400, COULD_NOT_READ_RUBRIC_LIST);
    });
  }

  return sendResponseData(req, res, 200, []);
};



export const getRubricContentsFn = (req, res) => {
  if (!checkClient(req, res)) {
    return res.status(401).send({message: FORBIDDEN_RESOURCE});
  }
  if (!req.body.rubricName) {
    return res.status(400).send({message: NOT_PROVIDED_RUBRIC});
  }
  const rubricName: string = req.body.rubricName;
  if (existsSync(CONFIG_DIR + RUBRICS_FILE)) {
    return readFromFile(req, res, CONFIG_DIR + RUBRICS_FILE, (data) => {
      if (!isJson(data)) {
        return res.status(400).send({message: INVALID_RUBRIC_JSON_FILE});
      }
      const rubrics: IRubric[] = JSON.parse(data.toString());
      if (Array.isArray(rubrics)) {
        let indexFound = -1;

        for (let i = 0; i < rubrics.length; i++) {
          if (rubrics[i].name.toLowerCase() === rubricName.toLowerCase()) {
            indexFound = i;
            break;
          }
        }

        if (indexFound === -1) {
          return res.status(404).send({message: 'Could not find rubric'});
        } else {
          return res.status(200).send(rubrics[indexFound]);
        }
      }

    });
  }
  return res.status(400).send({message: COULD_NOT_READ_RUBRIC_LIST});
};





export const assignmentRubricUpdateFn = (req, res) => {
  if (!checkClient(req, res)) {
    return res.status(401).send({message: FORBIDDEN_RESOURCE});
  }

  if (!req.body.assignmentName) {
    return res.status(400).send({message: NOT_PROVIDED_ASSIGNMENT_LOCATION});
  }

  const rubricName: string = (req.body.rubricName) ? req.body.rubricName : null;
  const assignmentName: string = req.body.assignmentName;

  if (existsSync(CONFIG_DIR + RUBRICS_FILE)) {
    return readFromFile(req, res, CONFIG_DIR + RUBRICS_FILE, (data) => {
      if (!isJson(data)) {
        return res.status(400).send({message: INVALID_RUBRIC_JSON_FILE});
      }
      const rubrics: IRubric[] = JSON.parse(data.toString());
      let rubric: IRubric;
      if (Array.isArray(rubrics)) {
        if (rubricName) {
          let indexFound = -1;

          for (let i = 0; i < rubrics.length; i++) {
            if (rubrics[i].name.toLowerCase() === rubricName.toLowerCase()) {
              indexFound = i;
              break;
            }
          }

          if (indexFound === -1) {
            return res.status(404).send({message: 'Could not find rubric'});
          }

          rubric = rubrics[indexFound];
        } else {
          rubric = null;
        }

        return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
          if (!isJson(data)) {
            return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
          }

          const config = JSON.parse(data.toString());
          try {
            const markFiles = glob.sync(config.defaultPath + sep + assignmentName + sep + '/**/' + MARK_FILE);
            markFiles.forEach(markFile => {
              unlinkSync(markFile);
            });
            return readFromFile(req, res, config.defaultPath + sep + assignmentName + sep + SETTING_FILE, (data) => {
              if (!isJson(data)) {
                return sendResponse(req, res, 400, 'invalid assignment settings');
              }

              const assignmentSettingsInfo: AssignmentSettingsInfo = JSON.parse(data);
              assignmentSettingsInfo.rubric = rubric;

              return writeToFile(req, res, config.defaultPath + sep + assignmentName + sep + SETTING_FILE,
                JSON.stringify(assignmentSettingsInfo), null, null, () => {

                  return checkAccess(req, res, config.defaultPath + sep + assignmentName + sep + GRADES_FILE, () => {
                    return csvtojson({noheader: true, trim: false}).fromFile(config.defaultPath + sep + assignmentName + sep + GRADES_FILE)
                      .then((gradesJSON) => {
                        let changed = false;
                        let assignmentHeader;
                        for (let i = 0; i < gradesJSON.length; i++) {
                          if (i === 0) {
                            const keys = Object.keys(gradesJSON[i]);
                            if (keys.length > 0) {
                              assignmentHeader = keys[0];
                            }
                          } else if (i > 1) {
                            gradesJSON[i].field5 = 0;
                            changed = true;
                          }
                        }

                        if (changed) {
                          return json2csv(gradesJSON, (err, csv) => {
                            if (err) {
                              return sendResponse(req, res, 400, 'Failed to convert json to csv!');
                            }

                            return writeToFile(req, res, config.defaultPath + sep + assignmentName + sep + GRADES_FILE, csv, 'Successfully saved marks!', 'Failed to save marks to ' + GRADES_FILE + ' file!', () => {
                              return sendResponseData(req, res, 200, assignmentSettingsInfo.rubric);
                            });
                          }, {emptyFieldValue: '', prependHeader: false});
                        } else {
                          return sendResponse(req, res, 400, 'Failed to save mark');
                        }
                      }, reason => {
                        return sendResponse(req, res, 400, reason);
                      });
                  });
                });
            });
          } catch (e) {
            return sendResponse(req, res, 500, e.message);
          }
        });
      }
    });
  }
  return res.status(400).send({message: COULD_NOT_READ_RUBRIC_LIST});
};
