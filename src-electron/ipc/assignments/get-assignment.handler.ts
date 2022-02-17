import {existsSync, readdirSync, readFileSync, writeFileSync} from 'fs';
import * as glob from 'glob';
import {getConfig} from '../config/config';
import {checkAccess, hierarchyModel, isJson, isNullOrUndefined, sendResponse, writeToFile} from '../../utils';
import {COMMENTS_FILE, CONFIG_DIR, GRADES_FILE, INVALID_STUDENT_FOLDER, MARK_FILE, SETTING_FILE} from '../../constants';
import {IComment} from '@coreModule/utils/comment.class';
import {dirname, sep} from 'path';
const csvtojson = require('csvtojson');
import {json2csv, json2csvAsync} from 'json-2-csv';
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;
import {forEach} from 'lodash';
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {readFile} from "fs/promises";
import {checkClient, readFromFile, sendResponseData} from "../../../src-express/utils";
import {
  CONFIG_FILE,
  FORBIDDEN_RESOURCE,
  INVALID_PATH_PROVIDED,
  NOT_CONFIGURED_CONFIG_DIRECTORY
} from "../../../src-express/constants";
import {validationResult} from "express-validator";

export function getAssignments(): Promise<any> {
  return getConfig().then((config) => {
    const folderModels = [];
    try {
      const folders: string[] = readdirSync(config.defaultPath);
      const folderCount = folders.length;
      if (folders.length) {
        forEach(folders, folder => {
          const files = glob.sync(config.defaultPath + '/' + folder + '/**');
          files.sort((a, b) => (a > b) ? 1 : -1);
          folderModels.push(hierarchyModel(files, config.defaultPath));
          if (folderModels.length === folderCount) {
            return false; // stop looping
          }
        });
        return folderModels;
      } else {
        return [];
      }
    } catch (e) {
      return Promise.reject(e.message);
    }
  });
}


export function saveMarks(event: IpcMainInvokeEvent, location: string, marks: any[] = [], totalMarks: any): Promise<any> {


  let totalMark = 0;
  if (!isNullOrUndefined(marks)) {
    const pages = Object.keys(marks);
    const commentsData = existsSync(CONFIG_DIR + COMMENTS_FILE) ? readFileSync(CONFIG_DIR + COMMENTS_FILE) : null;
    const comments: IComment[] = isNullOrUndefined(commentsData) ? null : JSON.parse(commentsData.toString());
    let commentbool = false;
    pages.forEach(page => {
      if (Array.isArray(marks[page])) {
        for (let i = 0; i < marks[page].length; i++) {
          totalMark += (marks[page][i] && marks[page][i].totalMark) ? marks[page][i].totalMark : 0;
          if (existsSync(CONFIG_DIR + COMMENTS_FILE)) {
            comments.forEach(comment => {
              if (marks[page][i].comment && marks[page][i].comment.includes(comment.title) && !comment.inUse) {
                commentbool = true;
                comment.inUse = true;
              }
            });
          }
        }
      }
    });
    if (commentbool) {
      try {
        writeFileSync(CONFIG_DIR + COMMENTS_FILE, JSON.stringify(comments));
      } catch (e) {
        return Promise.reject();
      }
    }
  }

  return getConfig().then((config) => {
    // console.log("Path Recieved: " + req.body.location);
    const loc = location.replace(/\//g, sep);
    console.log('loc after path: ' + loc);
    const pathSplit = loc.split(sep);
    console.log('split: ' + pathSplit);
    //  if (pathSplit.length !== 4)
    //  return sendResponse(req, res, 404, INVALID_PATH_PROVIDED);
    const pathSplitCount = pathSplit.length;

    const regEx = /(.*)\((.+)\)/;
    if (pathSplitCount === 4) {
      if (!regEx.test(pathSplit[1])) {
        return Promise.reject(INVALID_STUDENT_FOLDER);
      }
    } else if (pathSplitCount === 5) {
      if (!regEx.test(pathSplit[2])) {
        return Promise.reject(INVALID_STUDENT_FOLDER);
      }
    }
    console.log('loc before studFolder: ' + loc);
    const studentFolder = dirname(dirname(config.defaultPath + sep + loc));
    console.log('studentFolder: ' + studentFolder);
    return checkAccess(studentFolder).then(() => {

      if (pathSplitCount === 4) {
        return writeToFile(studentFolder + sep + MARK_FILE, new Uint8Array(Buffer.from(JSON.stringify(marks))), null, 'Failed to save student marks!').then(() => {
          const matches = regEx.exec(pathSplit[1]);
          console.log('matches: ' + matches);
          const studentNumber = matches[2] + '';
          console.log('studentNumber: ' + studentNumber);
          const assignmentFolder = dirname(studentFolder);
          console.log('assignmentFolder: ' + assignmentFolder);

          return checkAccess(assignmentFolder + sep + GRADES_FILE).then(() => {
            return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE)
              .then((gradesJSON) => {
                let changed = false;
                let assignmentHeader;
                for (let i = 0; i < gradesJSON.length; i++) {
                  if (i === 0) {
                    const keys = Object.keys(gradesJSON[i]);
                    if (keys.length > 0) {
                      assignmentHeader = keys[0];
                    }
                  } else if (i > 1 && !isNullOrUndefined(assignmentHeader) && gradesJSON[i] && gradesJSON[i][assignmentHeader].toUpperCase() === studentNumber.toUpperCase()) {
                    gradesJSON[i].field5 = totalMark;
                    changed = true;
                    return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false}).then((csv) => {
                      return writeToFile(assignmentFolder + sep + GRADES_FILE, csv, 'Successfully saved marks!', 'Failed to save marks to ' + GRADES_FILE + ' file!');
                    }, () => {
                      return Promise.reject('Failed to convert json to csv!');
                    });
                  }
                }

                if (changed) {
                  // more logic to save new JSON to CSV
                } else {
                  return Promise.reject('Failed to save mark');
                }
              }, reason => {
                return Promise.reject( reason);
              });
          });
        });
      }

      if (pathSplitCount === 5) {
        return writeToFile( studentFolder + sep + MARK_FILE, new Uint8Array(Buffer.from(JSON.stringify(marks))), null, 'Failed to save student marks!').then(() => {
          const matches = regEx.exec(pathSplit[2]);
          console.log('matches: ' + matches);
          const studentNumber = matches[2] + '';
          console.log('studentNumber: ' + studentNumber);
          const assignmentFolder = dirname(studentFolder);
          console.log('assignmentFolder: ' + assignmentFolder);

          return checkAccess(assignmentFolder + sep + GRADES_FILE).then(() => {
            return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE)
              .then((gradesJSON) => {
                let changed = false;
                let assignmentHeader;
                for (let i = 0; i < gradesJSON.length; i++) {
                  if (i === 0) {
                    const keys = Object.keys(gradesJSON[i]);
                    if (keys.length > 0) {
                      assignmentHeader = keys[0];
                    }
                  } else if (i > 1 && !isNullOrUndefined(assignmentHeader) && gradesJSON[i] && gradesJSON[i][assignmentHeader].toUpperCase() === studentNumber.toUpperCase()) {
                    gradesJSON[i].field5 = totalMark;
                    changed = true;
                    return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false}).then((csv) => {
                      return writeToFile(assignmentFolder + sep + GRADES_FILE, csv, 'Successfully saved marks!', 'Failed to save marks to ' + GRADES_FILE + ' file!');
                    },  (err) => {
                      return Promise.reject( 'Failed to convert json to csv!');
                    });
                  }
                }

                if (changed) {
                  // more logic to save new JSON to CSV
                } else {
                  return Promise.reject('Failed to save mark');
                }
              }, reason => {
                return Promise.reject( reason);
              });
          });
        });
      }

    });
  });
}



export function saveRubricMarks(event: IpcMainInvokeEvent, location: string, rubricName: string, marks: any[] = []): Promise<any> {

  rubricName = rubricName.trim();

  return getConfig().then((config) => {
    const loc = location.replace(/\//g, sep);
    console.log(loc);
    const pathSplit = loc.split(sep);
    const pathSplitCount = pathSplit.length;
    const regEx = /(.*)\((.+)\)/;
    if (pathSplitCount === 4) {
      if (!regEx.test(pathSplit[1])) {
        return Promise.reject(INVALID_STUDENT_FOLDER);
      }
    } else if (pathSplitCount === 5) {
      if (!regEx.test(pathSplit[2])) {
        return Promise.reject(INVALID_STUDENT_FOLDER);
      }
    }

    const studentFolder = dirname(dirname(config.defaultPath + sep + loc));
    const assignmentFolder = dirname(studentFolder);

    return readFile(assignmentFolder + sep + SETTING_FILE).then((data) => {
      if (!isJson(data)) {
        return Promise.reject('Could not read assignment settings');
      }

      const assignmentSettingsInfo: AssignmentSettingsInfo = JSON.parse(data.toString());

      if (isNullOrUndefined(assignmentSettingsInfo.rubric)) {
        return Promise.reject('Assignment\'s settings does not contain a rubric!');
      } else if (assignmentSettingsInfo.rubric.name !== rubricName) {
        return Promise.reject('Assignment\'s settings rubric does not match provided!');
      }

      let totalMark = 0;
      marks.forEach((levelIndex: number, index: number) => {
        if (levelIndex !== null) {
          totalMark += parseFloat('' + assignmentSettingsInfo.rubric.criterias[index].levels[levelIndex].score);
        }
      });

      return checkAccess(studentFolder).then(() => {
        return writeToFile(studentFolder + sep + MARK_FILE, new Uint8Array(Buffer.from(JSON.stringify(marks))), null, 'Failed to save student marks!').then(() => {
          if (pathSplitCount === 4) {

            const matches = regEx.exec(pathSplit[1]);

            const studentNumber = matches[2];
            return checkAccess(assignmentFolder + sep + GRADES_FILE).then(() => {
              return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE)
                .then((gradesJSON) => {
                  let changed = false;
                  let assignmentHeader;
                  for (let i = 0; i < gradesJSON.length; i++) {
                    if (i === 0) {
                      const keys = Object.keys(gradesJSON[i]);
                      if (keys.length > 0) {
                        assignmentHeader = keys[0];
                      }
                    } else if (i > 1 && !isNullOrUndefined(assignmentHeader) && gradesJSON[i] && gradesJSON[i][assignmentHeader].toUpperCase() === studentNumber.toUpperCase()) {
                      gradesJSON[i].field5 = totalMark;
                      changed = true;
                      return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false}).then((csv) => {
                        return writeToFile( assignmentFolder + sep + GRADES_FILE, csv, 'Successfully saved marks!', 'Failed to save marks to ' + GRADES_FILE + ' file!');
                      }, (err) => {
                        return Promise.reject( 'Failed to convert json to csv!');
                      });
                    }
                  }

                  if (changed) {
                    // more logic to save new JSON to CSV
                  } else {
                    return Promise.reject( 'Failed to save mark');
                  }
                }, (reason) => {
                  return Promise.reject(reason);
                });
            });
          } else
          if (pathSplitCount === 5) {

            const matches = regEx.exec(pathSplit[2]);

            const studentNumber = matches[2];
            return checkAccess(assignmentFolder + sep + GRADES_FILE).then(() => {
              return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE)
                .then((gradesJSON) => {
                  let changed = false;
                  let assignmentHeader;
                  for (let i = 0; i < gradesJSON.length; i++) {
                    if (i === 0) {
                      const keys = Object.keys(gradesJSON[i]);
                      if (keys.length > 0) {
                        assignmentHeader = keys[0];
                      }
                    } else if (i > 1 && !isNullOrUndefined(assignmentHeader) && gradesJSON[i] && gradesJSON[i][assignmentHeader].toUpperCase() === studentNumber.toUpperCase()) {
                      gradesJSON[i].field5 = totalMark;
                      changed = true;
                      return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false}).then((csv) => {
                        return writeToFile(assignmentFolder + sep + GRADES_FILE, csv, 'Successfully saved marks!', 'Failed to save marks to ' + GRADES_FILE + ' file!');
                      }, (err) => {
                        return Promise.reject( 'Failed to convert json to csv!');
                      });
                    }
                  }

                  if (changed) {
                    // more logic to save new JSON to CSV
                  } else {
                    return Promise.reject( 'Failed to save mark');
                  }
                }, (reason) => {
                  return Promise.reject( reason);
                });
            });
          }

        });
      });
    });
  });
}




export function getAssignmentSettings(event: IpcMainInvokeEvent, location: string): Promise<any> {

  return getConfig().then((config) => {
    const loc = location;
    if (isNullOrUndefined(loc) || loc === '') {
      return Promise.reject(INVALID_PATH_PROVIDED);
    }

    const assignmentFolder = config.defaultPath + sep + loc;
    if (existsSync(assignmentFolder)) {
      return readFile(assignmentFolder + sep + SETTING_FILE).then((data) => {
        if (!isJson(data)) {
          return Promise.reject('Assignment settings is not JSON');
        }
        return JSON.parse(data.toString());
      }, (error) => {
         return Promise.reject(error.message);
      });
    } else {
      return Promise.reject('Could not load assignment settings');
    }
  });
}
