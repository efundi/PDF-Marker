import {
  asyncForEach,
  checkAccess,
  checkClient, deleteFolderRecursive, hierarchyModel, isFolder, isJson,
  isNullOrUndefined,
  readFromFile,
  sendResponse,
  sendResponseData, uploadFiles,
  validateRequest,
  writeToFile
} from '../utils';
import {
  COMMENTS_FILE,
  CONFIG_DIR,
  CONFIG_FILE, COULD_NOT_READ_RUBRIC_LIST, FEEDBACK_FOLDER,
  FORBIDDEN_RESOURCE, GRADES_FILE, INVALID_PATH_PROVIDED, INVALID_RUBRIC_JSON_FILE, INVALID_STUDENT_FOLDER, MARK_FILE,
  NOT_CONFIGURED_CONFIG_DIRECTORY, NOT_PROVIDED_RUBRIC, RUBRICS_FILE, SETTING_FILE, SUBMISSION_FOLDER
} from '../constants';
import {
  access,
  accessSync,
  constants,
  existsSync, mkdirSync,
  readdirSync,
  readFile,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs';
import * as glob from 'glob';
import * as os from 'os';
import {copySync} from 'fs-extra';
import {IComment} from '../../src/app/modules/application/core/utils/comment.class';
import {basename, dirname, sep} from 'path';
import * as csvtojson from 'csvtojson';
import {json2csv, json2csvAsync} from 'json-2-csv';
import {AssignmentSettingsInfo} from '../../src/app/modules/pdf-marker/info-objects/assignment-settings.info';
import {validationResult} from 'express-validator';
import * as zipDir from 'zip-dir';
import {annotatePdfRubric} from '../pdf/rubric-annotations';
import {annotatePdfFile} from '../pdf/marking-annotations';
import {IRubric} from '../../src/app/modules/application/core/utils/rubric.class';
import {PDFDocument} from 'pdf-lib';
import {MarkInfo} from '../../src/app/modules/application/shared/info-objects/mark.info';
import * as fs from 'fs';
import * as path from 'path';
import {ShareAssignments} from '../../src/app/modules/application/shared/info-objects/share-assignments';
import {isNil, find} from 'lodash';





export const getMarks = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    const config = JSON.parse(data.toString());
    let loc = '';
    console.log('req.body.location: ' + req.body.location);
    const count = (req.body.location.match(new RegExp('/', 'g')) || []).length;
    //   commented this out for workspace path change, does not seem to affect root assignments either...
    //   if (count > 3) {
    //    var splitArray = req.body.location.split("/");
    //    loc = splitArray[0] + "/" + splitArray[1];
    //  }
    //  else
    loc = req.body.location.replace(/\//g, sep);

    console.log('Loc: ' + loc);
    // const pathSplit = loc.split(sep);
    // if (pathSplit.length !== 4)
    //  return sendResponse(req, res, 404, INVALID_PATH_PROVIDED);

    // const regEx = /(.*)\((.+)\)/;
    // if (!regEx.test(pathSplit[1]))
    // return sendResponse(req, res, 404, INVALID_STUDENT_FOLDER);

    const studentFolder = dirname(dirname(config.defaultPath + sep + loc));

    return readFile(studentFolder + sep + MARK_FILE, (err, data) => {
      if (err) {
        return sendResponseData(req, res, 200, []);
      }

      if (!isJson(data)) {
        return sendResponseData(req, res, 200, []);
      } else {
        return sendResponseData(req, res, 200, JSON.parse(data.toString()));
      }
    });
  });
};





// Only For updating colour for now
export const assignmentSettings = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  const updatedSettings = (req.body.settings !== null && req.body.settings !== undefined) ? req.body.settings : {};
  if (JSON.stringify(updatedSettings) === JSON.stringify({})) {
    return res.status(200).send();
  }

  // Check object compliance
  const keys = ['defaultColour', 'isCreated', 'rubric', ' rubricId'];
  const assignmentSettingsKeys = Object.keys(updatedSettings);
  let invalidKeyFound = false;
  assignmentSettingsKeys.forEach(key => {
    invalidKeyFound = (keys.indexOf(key) === -1);
  });

  if (invalidKeyFound) {
    return sendResponse(req, res, 400, 'Invalid key found in settings');
  }

  return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);
    const pathSplit = loc.split(sep);
    if (pathSplit.length !== 4) {
      return sendResponse(req, res, 404, INVALID_PATH_PROVIDED);
    }

    const regEx = /(.*)\((.+)\)/;
    if (!regEx.test(pathSplit[1])) {
      return sendResponse(req, res, 404, INVALID_STUDENT_FOLDER);
    }

    const assignmentFolder = dirname(dirname(dirname(config.defaultPath + sep + loc)));

    return checkAccess(req, res, assignmentFolder, () => {
      return readFromFile(req, res, assignmentFolder + sep + SETTING_FILE, (data) => {
        if (!isJson(data)) {
          return sendResponse(req, res, 400, 'Assignment settings file corrupt!');
        }

        const settings: AssignmentSettingsInfo = JSON.parse(data);
        settings.defaultColour = (updatedSettings.defaultColour) ? updatedSettings.defaultColour : settings.defaultColour;
        const buffer = new Uint8Array(Buffer.from(JSON.stringify(settings)));

        return writeToFile(req, res, assignmentFolder + sep + SETTING_FILE, buffer, null, 'Failed to save assignment settings!', () => {
          return sendResponseData(req, res, 200, updatedSettings);
        });
      });
    });
  });
};



export const getAssignmentSettings = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    const config = JSON.parse(data.toString());
    const loc = req.body.location;
    if (isNullOrUndefined(loc) || loc === '') {
      return sendResponse(req, res, 404, INVALID_PATH_PROVIDED);
    }

    const assignmentFolder = config.defaultPath + sep + loc;
    if (existsSync(assignmentFolder)) {
      return readFile(assignmentFolder + sep + SETTING_FILE, (err, data) => {
        if (err) {
          return sendResponseData(req, res, 400, err.message);
        }

        if (!isJson(data)) {
          return sendResponseData(req, res, 400, err.message);
        } else {
          return sendResponseData(req, res, 200, JSON.parse(data.toString()));
        }
      });
    }
  });
};



// rubircFinalize
export const finalizeAssignmentRubric = async (req, res) => {
  let failed = false;
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  const keys = ['workspaceFolder', 'location', 'rubricName'];
  const bodyKeys = Object.keys(req.body);

  if (validateRequest(keys, bodyKeys)) {
    return sendResponse(req, res, 400, 'Invalid parameter found in request');
  }

  try {
    const data = readFileSync(CONFIG_DIR + CONFIG_FILE);
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);
    let workspaceFolder = '';
    if (req.body.workspaceFolder) {
      workspaceFolder = req.body.workspaceFolder.replace(/\//g, sep);
    }
    const assignmentFolder = (workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ?
      config.defaultPath + sep + workspaceFolder + sep + loc : config.defaultPath + sep + loc;
    const gradesJSON = await csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE);
    const files = glob.sync(assignmentFolder + sep + '/*');
    const assignmentSettingsBuffer = readFileSync(assignmentFolder + sep + SETTING_FILE);
    if (!isJson(assignmentSettingsBuffer)) {
      return sendResponse(req, res, 400, 'Invalid assignment settings file!');
    }

    const assignmentSettingsInfo: AssignmentSettingsInfo = JSON.parse(assignmentSettingsBuffer.toString());

    const start = async () => {
      await asyncForEach(files, async (file) => {
        if (statSync(file).isDirectory()) {
          const regEx = /(.*)\((.+)\)$/;
          if (!regEx.test(file)) {
            failed = true;
            return sendResponse(req, res, 500, INVALID_STUDENT_FOLDER + ' ' + basename(file));
          }

          const matches = regEx.exec(file);

          const submissionFiles = glob.sync(file + sep + SUBMISSION_FOLDER + '/*');
          const rubricName = req.body.rubricName.trim();

          if (isNullOrUndefined(assignmentSettingsInfo.rubric)) {
            return sendResponse(req, res, 400, 'Assignment\'s settings does not contain a rubric!');
          } else if (assignmentSettingsInfo.rubric.name !== rubricName) {
            return sendResponse(req, res, 400, 'Assignment\'s settings rubric does not match provided!');
          }

          const rubric = assignmentSettingsInfo.rubric;

          await asyncForEach(submissionFiles, async (submission) => {
            try {
              accessSync(submission, constants.F_OK);
              const studentFolder = dirname(dirname(submission));

              let marks;
              let data;
              try {
                data = readFileSync(studentFolder + sep + MARK_FILE);
              } catch (e) {
                marks = [];
              }

              if (!isJson(data)) {
                marks = [];
              } else {
                marks = JSON.parse(data.toString());
              }

              if (marks.length > 0) {
                const annotateRubricFN = async (): Promise<{ pdfBytes: Uint8Array, totalMark: number }> => {
                  return await annotatePdfRubric(res, submission, marks, assignmentSettingsInfo.rubric);
                };

                await annotateRubricFN().then(async (data) => {
                  const ext = path.extname(submission);
                  const fileName = path.basename(submission, ext) + '_MARK';
                  writeFileSync(studentFolder + sep + FEEDBACK_FOLDER + sep + fileName + '.pdf', data.pdfBytes);
                  accessSync(assignmentFolder + sep + GRADES_FILE, constants.F_OK);
                  let changed = false;
                  let assignmentHeader;
                  for (let i = 0; i < gradesJSON.length; i++) {
                    if (i === 0) {
                      const gradesKeys = Object.keys(gradesJSON[i]);
                      if (gradesKeys.length > 0) {
                        assignmentHeader = gradesKeys[0];
                      }
                    } else if (i > 1 && !isNullOrUndefined(assignmentHeader) && gradesJSON[i] && gradesJSON[i][assignmentHeader].toUpperCase() === matches[2].toUpperCase()) {
                      gradesJSON[i].field5 = data.totalMark;
                      changed = true;
                      await json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false})
                        .then(csv => {
                          writeFileSync(assignmentFolder + sep + GRADES_FILE, csv);
                        })
                        .catch(() => {
                          failed = true;
                          return sendResponse(req, res, 400, 'Failed to save marks to ' + GRADES_FILE + ' file for student ' + matches[2] + '!');
                        });

                      break;
                    }
                  }
                  if (!changed) {
                    failed = true;
                    return sendResponse(req, res, 400, 'Failed to save mark');
                  }
                }, (error) => {
                  failed = true;
                  return sendResponse(req, res, 400, 'Error annotating marks to PDF [' + error.message + ']');
                });
              }
            } catch (e) {
              failed = true;
              return sendResponse(req, res, 400, e.message);
            }
          });
        }
      });
    };
    await start();
    if (!failed) {
      return zipDir((workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ? config.defaultPath + sep + workspaceFolder : config.defaultPath,
        {filter: (filterPath: string, stat) => (!(/\.marks\.json|.settings.json|\.zip$/.test(filterPath)) && ((filterPath.endsWith(assignmentFolder)) ? true : (filterPath.startsWith(assignmentFolder + sep))))}, (err, buffer) => {
          if (err) {
            return sendResponse(req, res, 400, 'Could not export assignment');
          }
          return sendResponseData(req, res, 200, buffer);
        });
    }
  } catch (e) {
    return sendResponse(req, res, 500, e.message);
  }
};


function cleanupTemp(tmpDir: string){
  try {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  } catch (e) {
    console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
  }
}

export const shareExport = async (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  const keys = ['assignmentName', 'submissions', 'workspaceFolder'];
  const bodyKeys = Object.keys(req.body);

  if (validateRequest(keys, bodyKeys)) {
    return sendResponse(req, res, 400, 'Invalid parameter found in request');
  }

  try {
    const configData = readFileSync(CONFIG_DIR + CONFIG_FILE);
    if (!isJson(configData)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }
    const shareRequest: ShareAssignments = req.body;
    const config = JSON.parse(configData.toString());
    const assignmentName = shareRequest.assignmentName.replace(/\//g, sep);
    let workspaceFolder = '';
    if (req.body.workspaceFolder) {
      workspaceFolder = shareRequest.workspaceFolder.replace(/\//g, sep);
    }
    const originalAssignmentDirectory = (workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ? config.defaultPath + sep + workspaceFolder + sep + assignmentName : config.defaultPath + sep + assignmentName;
    const gradesJSON = await csvtojson({noheader: true, trim: false}).fromFile(originalAssignmentDirectory + sep + GRADES_FILE);
    let tmpDir;
    // Create a temp directory to construct files to zip
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfm-'));

    const tempAssignmentDirectory = tmpDir + sep + assignmentName;
    fs.mkdirSync(tempAssignmentDirectory);

    // Now copy each submission
    shareRequest.submissions.forEach((submission) => {
      const submissionDirectoryName = submission.studentName + '(' + submission.studentNumber + ')';
      copySync(originalAssignmentDirectory + sep + submissionDirectoryName, tempAssignmentDirectory + sep + submissionDirectoryName);
    });

    const shareGradesJson = [
      gradesJSON[0],
      gradesJSON[1],
      gradesJSON[2],
    ];
    for (let i = 3; i < gradesJSON.length; i++) {
      const gradesStudentId = gradesJSON[i].field2;
      const shouldExport = !isNil(find(shareRequest.submissions, {studentNumber: gradesStudentId}));
      if (shouldExport) {
        shareGradesJson.push(gradesJSON[i]);
      }
    }

    json2csvAsync(shareGradesJson, {emptyFieldValue: '', prependHeader: false})
      .then(csv => {
        writeFileSync(tempAssignmentDirectory + sep + GRADES_FILE, csv);
      })
      .then(() => {
        return zipDir(tmpDir);
      })
      .then((buffer) => {
        sendResponseData(req, res, 200, buffer);
        cleanupTemp(tmpDir);
      }, (error) => {
        cleanupTemp(tmpDir);
        return sendResponse(req, res, 500, error.message);
      });

  } catch (e) {
    console.error(e);
    return sendResponse(req, res, 500, 'Error trying to export share');
  }
};


export const finalizeAssignment = async (req, res) => {
  let failed = false;
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  const keys = ['workspaceFolder', 'location'];
  const bodyKeys = Object.keys(req.body);

  if (validateRequest(keys, bodyKeys)) {
    return sendResponse(req, res, 400, 'Invalid parameter found in request');
  }

  try {
    const configData = readFileSync(CONFIG_DIR + CONFIG_FILE);
    if (!isJson(configData)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    const config = JSON.parse(configData.toString());
    const loc = req.body.location.replace(/\//g, sep);
    let workspaceFolder = '';
    if (req.body.workspaceFolder) {
      workspaceFolder = req.body.workspaceFolder.replace(/\//g, sep);
    }
    const assignmentFolder = (workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ? config.defaultPath + sep + workspaceFolder + sep + loc : config.defaultPath + sep + loc;
    const gradesJSON = await csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE);
    const files = glob.sync(assignmentFolder + sep + '/*');

    const start = async () => {
      await asyncForEach(files, async (file) => {
        if (statSync(file).isDirectory()) {
          const regEx = /(.*)\((.+)\)$/;
          if (!regEx.test(file)) {
            failed = true;
            return sendResponse(req, res, 500, INVALID_STUDENT_FOLDER + ' ' + basename(file));
          }

          const matches = regEx.exec(file);

          const submissionFiles = glob.sync(file + sep + SUBMISSION_FOLDER + '/*');

          await asyncForEach(submissionFiles, async (submission) => {
            try {
              accessSync(submission, constants.F_OK);
              const studentFolder = dirname(dirname(submission));

              let marks: MarkInfo[][] = [];
              let marksData;
              try {
                marksData = readFileSync(studentFolder + sep + MARK_FILE);
              } catch (e) {
                marks = [];
              }

              if (isJson(marksData)) {
                marks = JSON.parse(marksData.toString());
              }

              if (marks.length > 0) {
                const annotateFN = async (): Promise<{ pdfBytes: Uint8Array, totalMark: number }> => {
                  return await annotatePdfFile(res, submission, marks);
                };

                const ext = path.extname(submission);
                let fileName = path.basename(submission, ext);
                await annotateFN().then(async (data) => {
                  fileName += '_MARK';
                  writeFileSync(studentFolder + sep + FEEDBACK_FOLDER + sep + fileName + '.pdf', data.pdfBytes);
                  unlinkSync(submission);
                  accessSync(assignmentFolder + sep + GRADES_FILE, constants.F_OK);
                  let changed = false;
                  let assignmentHeader;
                  for (let i = 0; i < gradesJSON.length; i++) {
                    if (i === 0) {
                      const gradeKeys = Object.keys(gradesJSON[i]);
                      if (gradeKeys.length > 0) {
                        assignmentHeader = gradeKeys[0];
                      }
                    } else if (i > 1 && !isNullOrUndefined(assignmentHeader) && gradesJSON[i] && gradesJSON[i][assignmentHeader].toUpperCase() === matches[2].toUpperCase()) {
                      gradesJSON[i].field5 = data.totalMark;
                      changed = true;
                      await json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false})
                        .then(csv => {
                          writeFileSync(assignmentFolder + sep + GRADES_FILE, csv);
                        })
                        .catch(() => {
                          failed = true;
                          return sendResponse(req, res, 400, 'Failed to save marks to ' + GRADES_FILE + ' file for student ' + matches[2] + '!');
                        });

                      break;
                    }
                  }
                  if (!changed) {
                    failed = true;
                    return sendResponse(req, res, 400, 'Failed to save mark');
                  }
                }, (error) => {
                  failed = true;
                  return sendResponse(req, res, 400, 'Error annotating marks to PDF ' + fileName + ' [' + error.message + ']');
                });
              }
            } catch (e) {
              failed = true;
              return sendResponse(req, res, 400, e.message);
            }
          });
        }
      });
    };
    await start();
    if (!failed) {
      return zipDir((workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ? config.defaultPath + sep + workspaceFolder : config.defaultPath,
        {filter: (path: string, stat) => (!(/\.marks\.json|\.settings\.json|\.zip$/.test(path)) && ((path.endsWith(assignmentFolder)) ? true : (path.startsWith((assignmentFolder) + sep))))}, (err, buffer) => {
          if (err) {
            return sendResponse(req, res, 400, 'Could not export assignment');
          }
          return sendResponseData(req, res, 200, buffer);
        });
    }
  } catch (e) {
    return sendResponse(req, res, 500, e.message);
  }
};



export const getGrades = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  const keys = ['location'];
  const bodyKeys = Object.keys(req.body);

  if (validateRequest(keys, bodyKeys)) {
    return sendResponse(req, res, 400, 'Invalid parameter found in request');
  }

  return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);
    const assignmentFolder = config.defaultPath + sep + loc;

    return checkAccess(req, res, assignmentFolder + sep + GRADES_FILE, () => {
      return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE)
        .then((gradesJSON) => {
          return sendResponseData(req, res, 200, gradesJSON);
        }, reason => {
          return sendResponse(req, res, 400, reason);
        });
    });
  });
};




export const getAssignmentGlobalSettings = (req, res) => {
  if (!checkClient(req, res)) {
    return res.status(401).send({message: 'Forbidden access to resource!'});
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array()});
  }

  const keys = ['location'];
  const bodyKeys = Object.keys(req.body);

  if (validateRequest(keys, bodyKeys)) {
    return res.status(400).send({message: 'Invalid parameter found in request'});
  }

  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err) {
      return res.status(500).send({message: 'Failed to read configurations!'});
    }

    if (!isJson(data)) {
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});
    }

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);

    const assignmentFolder = config.defaultPath + sep + loc;

    return access(assignmentFolder + sep + '.settings.json', constants.F_OK, (err) => {
      if (err) {
        return res.status(200).send({message: 'Could not read settings file'});
      }
      return (assignmentFolder + sep + '.settings.json');
    });
  });
};




export const createAssignment = (req, res) => {
  const acceptedParams = ['assignmentName', 'workspaceFolder', 'noRubric', 'rubric', 'studentDetails'];
  const receivedParams = Object.keys(req.body);
  let isInvalidKey = false;
  let invalidParam: string;
  uploadFiles(req, res, async function(err) {
    if (err) {
      return sendResponse(req, res, 400, 'Error uploading PDF files!');
    } else {
      for (const receivedParam of receivedParams) {
        if (acceptedParams.indexOf(receivedParam)) {
          isInvalidKey = true;
          invalidParam = receivedParam;
          break;
        }
      }
// if (req.body.workspace === "Default Workspace" || req.body.workspace === null || req.body.workspace === "null") {
      if (isInvalidKey) {
        return sendResponse(req, res, 400, `Invalid parameter ${invalidParam} found in request`);
      }

      if (req.body.assignmentName.legnth < 5) {
        return sendResponse(req, res, 400, `Assignment must be > 5 characters`);
      }

      let assignmentName: string = req.body.assignmentName.trim();

      try {
        const data = readFileSync(CONFIG_DIR + CONFIG_FILE);
        if (!isJson(data)) {
          return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
        }

        const config = JSON.parse(data.toString());
        const folders = glob.sync(config.defaultPath + '/*');

        let foundCount = 0;
        for (let i = 0; i < folders.length; i++) {
          if (isFolder(folders[i])) {
            const assignmentDirectoryName = path.basename(folders[i]);
            // Doing a casesensitive check on the directory names - for Window's sake
            if (assignmentName.toLowerCase() === assignmentDirectoryName.toLowerCase()) {
              foundCount++;

              // Doing a casesensitive check on the directory names - for Window's sake
            } else if ((assignmentName.toLowerCase() + ' (' + (foundCount + 1) + ')') === assignmentDirectoryName.toLowerCase()) {
              foundCount++;
            }
          }
        }

        if (foundCount > 0) {
          assignmentName = assignmentName + ' (' + (foundCount + 1) + ')';
        }

        const isRubric: boolean = (req.body.noRubric === 'true');
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
            const rubricData = readFileSync(CONFIG_DIR + RUBRICS_FILE);
            try {
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
        if (!isJson(req.body.studentDetails)) {
          return sendResponse(req, res, 400, `Student details not valid`);
        }

        const studentDetails: any[] = JSON.parse(req.body.studentDetails);

        if (!Array.isArray(studentDetails)) {
          return sendResponse(req, res, 400, `Student details must be a list`);
        }

        if (studentDetails.length !== req.files.length) {
          return sendResponse(req, res, 400, `Student details is not equal to number of files sent!`);
        }

        const settings: AssignmentSettingsInfo = {defaultColour: '#6F327A', rubric, isCreated: true};

        let count = 0;
        const headers = `'${assignmentName}','SCORE_GRADE_TYPE'\n`;
        const line = `''\n`;
        const subheaders = `'Display ID','ID','Last Name','First Name','Mark','Submission date','Late submission'\n`;
        let csvString = headers + line + subheaders;
        for (const studentInfo of studentDetails) {
          const file: any = req.files[count];
          const studentFolder = studentInfo.studentSurname.toUpperCase() + ', ' + studentInfo.studentName.toUpperCase() + '(' + studentInfo.studentId.toUpperCase() + ')';
          const feedbackFolder = studentFolder + sep + FEEDBACK_FOLDER;
          const submissionFolder = studentFolder + sep + SUBMISSION_FOLDER;
          const csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
          csvString += csvData;

          if (req.body.workspace === 'Default Workspace' || req.body.workspace === null || req.body.workspace === 'null') {
            mkdirSync(config.defaultPath + sep + assignmentName + sep + feedbackFolder, {recursive: true});
            mkdirSync(config.defaultPath + sep + assignmentName + sep + submissionFolder, {recursive: true});
            const content = readFileSync(file.path);
            const pdfDoc = await PDFDocument.load(content);
            const pdfBytes = await pdfDoc.save();
            await writeFileSync(config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + file.originalname, pdfBytes);
            count++;
          } else {
            mkdirSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + feedbackFolder, {recursive: true});
            mkdirSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + submissionFolder, {recursive: true});
            const content = readFileSync(file.path);
            const pdfDoc = await PDFDocument.load(content);
            const pdfBytes = await pdfDoc.save();
            await writeFileSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + submissionFolder + sep + file.originalname, pdfBytes);
            count++;
          }
        }

        if (req.body.workspace === 'Default Workspace' || req.body.workspace === null || req.body.workspace === 'null') {
          writeFileSync(config.defaultPath + sep + assignmentName + sep + GRADES_FILE, csvString);
          writeFileSync(config.defaultPath + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
          const files = glob.sync(config.defaultPath + sep + assignmentName + sep + '/**');
          files.sort((a, b) => (a > b) ? 1 : -1);
          const folderModel = hierarchyModel(files, config.defaultPath);
          return sendResponseData(req, res, 200, folderModel);
        } else {
          writeFileSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + GRADES_FILE, csvString);
          writeFileSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
          const files = glob.sync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + '/**');
          files.sort((a, b) => (a > b) ? 1 : -1);
          const folderModel = hierarchyModel(files, config.defaultPath + sep + req.body.workspace);
          return sendResponseData(req, res, 200, folderModel);
        }


      } catch (e) {
        return sendResponse(req, res, 400, e.message);
      }
    }
  });
};




export const updateAssignment = (req, res) => {
  const acceptedParams = ['assignmentName',  'workspaceFolder', 'studentDetails', 'isEdit'];
  const receivedParams = Object.keys(req.body);
  let isInvalidKey = false;
  let invalidParam: string;
  uploadFiles(req, res, async function(err) {
    if (err) {
      return sendResponse(req, res, 400, 'Error uploading PDF files!');
    } else {
      for (const receivedParam of receivedParams) {
        if (acceptedParams.indexOf(receivedParam)) {
          isInvalidKey = true;
          invalidParam = receivedParam;
          break;
        }
      }

      if (isInvalidKey) {
        return sendResponse(req, res, 400, `Invalid parameter ${invalidParam} found in request`);
      }

      if (req.body.assignmentName.legnth < 5) {
        return sendResponse(req, res, 400, `Assignment must be > 5 characters`);
      }

      const assignmentName: string = req.body.assignmentName.trim();
      const isEdit: boolean = (req.body.isEdit && req.body.isEdit === 'true');

      try {
        const data = readFileSync(CONFIG_DIR + CONFIG_FILE);
        if (!isJson(data)) {
          return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
        }

        const config = JSON.parse(data.toString());
        let assignmentSettingsBuffer;
        if (req.body.workspace === 'Default Workspace' || req.body.workspace === null || req.body.workspace === 'null') {
          assignmentSettingsBuffer = readFileSync(config.defaultPath + sep + assignmentName + sep + SETTING_FILE);
          if (!isJson(assignmentSettingsBuffer)) {
            return sendResponse(req, res, 400, 'Invalid assignment settings file!');
          }

        } else {
          assignmentSettingsBuffer = readFileSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + SETTING_FILE);
          if (!isJson(assignmentSettingsBuffer)) {
            return sendResponse(req, res, 400, 'Invalid assignment settings file!');
          }
        }
        const assignmentSettingsInfo: AssignmentSettingsInfo = JSON.parse(assignmentSettingsBuffer.toString());
        if (!assignmentSettingsInfo.isCreated) {
          return sendResponse(req, res, 400, 'Operation not permitted on this type of assignment!');
        }

        if (!isJson(req.body.studentDetails)) {
          return sendResponse(req, res, 400, `Student details not valid`);
        }

        const studentDetails: any[] = JSON.parse(req.body.studentDetails);

        if (!Array.isArray(studentDetails)) {
          return sendResponse(req, res, 400, `Student details must be a list`);
        }

        if (studentDetails.length !== req.files.length) {
          return sendResponse(req, res, 400, `Student details is not equal to number of files sent!`);
        }

        const grades = await csvtojson({
          noheader: true,
          trim: false
        }).fromFile(
          (req.body.workspace === 'Default Workspace' || req.body.workspace === null || req.body.workspace === 'null') ?
            config.defaultPath + sep + assignmentName + sep + GRADES_FILE :
            config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + GRADES_FILE);

        let count = 0;
        const headers = `'${assignmentName}','SCORE_GRADE_TYPE'\n`;
        const line = `''\n`;
        const subheaders = `'Display ID','ID','Last Name','First Name','Mark','Submission date','Late submission'\n`;
        let csvString = headers + line + subheaders;
        for (const studentInfo of studentDetails) {
          const file: any = req.files[count];
          const studentFolder = studentInfo.studentSurname.toUpperCase() + ', ' + studentInfo.studentName.toUpperCase() + '(' + studentInfo.studentId.toUpperCase() + ')';
          const feedbackFolder = studentFolder + sep + FEEDBACK_FOLDER;
          const submissionFolder = studentFolder + sep + SUBMISSION_FOLDER;
          let csvData = '';

          if (req.body.workspace === 'Default Workspace' || req.body.workspace === null || req.body.workspace === 'null') {
            if (existsSync(config.defaultPath + sep + assignmentName + sep + studentFolder)) {
              if (studentInfo.remove) {
                deleteFolderRecursive(config.defaultPath + sep + assignmentName + sep + studentFolder);
              } else {
                const studentRecord = grades.find(grade => grade[Object.keys(grades[0])[0]] === studentInfo.studentId.toUpperCase());
                if (studentRecord) {
                  csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},${studentRecord.field5},,\n`;
                } else {
                  csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
                }
              }
            } else {
              mkdirSync(config.defaultPath + sep + assignmentName + sep + feedbackFolder, {recursive: true});
              mkdirSync(config.defaultPath + sep + assignmentName + sep + submissionFolder, {recursive: true});

              const content = readFileSync(file.path);
              const pdfDoc = await PDFDocument.load(content);
              const pdfBytes = await pdfDoc.save();
              await writeFileSync(config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + file.originalname, pdfBytes);
              // copyFileSync(file.path, config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + file.originalname);
              csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
            }
          } else {
            if (existsSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + studentFolder)) {
              if (studentInfo.remove) {
                deleteFolderRecursive(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + studentFolder);
              } else {
                const studentRecord = grades.find(grade => grade[Object.keys(grades[0])[0]] === studentInfo.studentId.toUpperCase());
                if (studentRecord) {
                  csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},${studentRecord.field5},,\n`;
                } else {
                  csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
                }
              }
            } else {
              mkdirSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + feedbackFolder, {recursive: true});
              mkdirSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + submissionFolder, {recursive: true});

              const content = readFileSync(file.path);
              const pdfDoc = await PDFDocument.load(content);
              const pdfBytes = await pdfDoc.save();
              await writeFileSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + submissionFolder + sep + file.originalname, pdfBytes);
              // copyFileSync(file.path, config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + file.originalname);
              csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
            }
          }
          csvString += csvData;
          count++;
        }

        //
        if (req.body.workspace === 'Default Workspace' || req.body.workspace === null || req.body.workspace === 'null') {
          writeFileSync(config.defaultPath + sep + assignmentName + sep + GRADES_FILE, csvString);
          // writeFileSync(config.defaultPath + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
          const files = glob.sync(config.defaultPath + sep + assignmentName + sep + '/**');
          files.sort((a, b) => (a > b) ? 1 : -1);
          const folderModel = hierarchyModel(files, config.defaultPath);
          return sendResponseData(req, res, 200, folderModel);
        } else {
          writeFileSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + GRADES_FILE, csvString);
          // writeFileSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
          const files = glob.sync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + '/**');
          files.sort((a, b) => (a > b) ? 1 : -1);
          const folderModel = hierarchyModel(files, config.defaultPath + sep + req.body.workspace);
          return sendResponseData(req, res, 200, folderModel);
        }
      } catch (e) {
        return sendResponse(req, res, 400, e.message);
      }
    }
  });
};
