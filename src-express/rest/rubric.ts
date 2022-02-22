import {
  checkAccess,
  checkClient,
  isJson,
  readFromFile,
  sendResponse,
  sendResponseData,
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
import * as glob from 'glob';
import {AssignmentSettingsInfo} from '../../src/shared/info-objects/assignment-settings.info';
import * as csvtojson from 'csvtojson';
import {json2csv} from 'json-2-csv';
import {IRubric, IRubricName} from "../../src/shared/info-objects/rubric.class";

const rubricFileUpload = (req, res) => {

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

  return rubricFileUpload(req, res);
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










