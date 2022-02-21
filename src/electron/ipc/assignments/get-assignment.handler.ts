import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'fs';
import * as glob from 'glob';
import {getConfig} from '../config/config';
import {
  checkAccess,
  deleteFolderRecursive,
  hierarchyModel,
  isJson,
  isNullOrUndefined,
  uploadFiles,
  writeToFile
} from '../../utils';
import {
  COMMENTS_FILE,
  CONFIG_DIR,
  FEEDBACK_FOLDER,
  GRADES_FILE,
  INVALID_PATH_PROVIDED,
  INVALID_STUDENT_FOLDER,
  MARK_FILE,
  SETTING_FILE, SUBMISSION_FOLDER
} from '../../constants';
import {IComment} from '@coreModule/utils/comment.class';
import {basename, dirname, sep} from 'path';
import {json2csvAsync} from 'json-2-csv';
import {AssignmentSettingsInfo} from '@pdfMarkerModule/info-objects/assignment-settings.info';
import {readFile} from 'fs/promises';
import {MarkInfo} from '@sharedModule/info-objects/mark.info';
import {forEach, isNil} from 'lodash';
import * as Electron from 'electron';
const csvtojson = require('csvtojson');
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;
import {UpdateAssignment} from "../../../shared/info-objects/update-assignment";
import {PDFDocument} from 'pdf-lib';

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



export function getMarks(event: IpcMainInvokeEvent, location: string): Promise<MarkInfo[]> {
  return getConfig().then((config) => {
    let loc = '';
    const count = (location.match(new RegExp('/', 'g')) || []).length;
    //   commented this out for workspace path change, does not seem to affect root assignments either...
    //   if (count > 3) {
    //    var splitArray = req.body.location.split("/");
    //    loc = splitArray[0] + "/" + splitArray[1];
    //  }
    //  else
    loc = location.replace(/\//g, sep);

    console.log('Loc: ' + loc);
    // const pathSplit = loc.split(sep);
    // if (pathSplit.length !== 4)
    //  return sendResponse(req, res, 404, INVALID_PATH_PROVIDED);

    // const regEx = /(.*)\((.+)\)/;
    // if (!regEx.test(pathSplit[1]))
    // return sendResponse(req, res, 404, INVALID_STUDENT_FOLDER);

    const studentFolder = dirname(dirname(config.defaultPath + sep + loc));

    return readFile(studentFolder + sep + MARK_FILE).then((data) => {
      if (!isJson(data)) {
        return [];
      } else {
        return JSON.parse(data.toString());
      }
    }, (err) => {
      return [];
    });
  });
}



// Only For updating colour for now
export function updateAssignmentSettings(event: IpcMainInvokeEvent, updatedSettings: any = {}, location: string): Promise<any> {

  if (JSON.stringify(updatedSettings) === JSON.stringify({})) {
    return Promise.resolve();
  }

  // Check object compliance
  const keys = ['defaultColour', 'isCreated', 'rubric', ' rubricId'];
  const assignmentSettingsKeys = Object.keys(updatedSettings);
  let invalidKeyFound = false;
  assignmentSettingsKeys.forEach(key => {
    invalidKeyFound = (keys.indexOf(key) === -1);
  });

  if (invalidKeyFound) {
    return Promise.reject('Invalid key found in settings');
  }

  return getConfig().then((config) => {
    const loc = location.replace(/\//g, sep);
    const pathSplit = loc.split(sep);
    if (pathSplit.length !== 4) {
      return Promise.reject(INVALID_PATH_PROVIDED);
    }

    const regEx = /(.*)\((.+)\)/;
    if (!regEx.test(pathSplit[1])) {
      return Promise.reject(INVALID_STUDENT_FOLDER);
    }

    const assignmentFolder = dirname(dirname(dirname(config.defaultPath + sep + loc)));

    return checkAccess(assignmentFolder).then(() => {
      return readFile( assignmentFolder + sep + SETTING_FILE).then((data) => {
        if (!isJson(data)) {
          return Promise.reject('Assignment settings file corrupt!');
        }

        const originalSettings: AssignmentSettingsInfo = JSON.parse(data.toString());
        originalSettings.defaultColour = (updatedSettings.defaultColour) ? updatedSettings.defaultColour : originalSettings.defaultColour;
        const buffer = new Uint8Array(Buffer.from(JSON.stringify(originalSettings)));

        return writeToFile(assignmentFolder + sep + SETTING_FILE, buffer, null, 'Failed to save assignment settings!').then(() => {
          return updatedSettings;
        });
      });
    });
  });
}



export function updateAssignment(event: IpcMainInvokeEvent, updateRequest: UpdateAssignment): Promise<any> {
  if (updateRequest.assignmentName.length < 5) {
    return Promise.reject(`Assignment must be > 5 characters`);
  }

  const assignmentName: string = updateRequest.assignmentName.trim();
  try {
    return getConfig().then(async (config) => {
      let assignmentSettingsBuffer;
      if (updateRequest.workspace === 'Default Workspace' || isNil(updateRequest.workspace)) {
        assignmentSettingsBuffer = readFileSync(config.defaultPath + sep + assignmentName + sep + SETTING_FILE);
        if (!isJson(assignmentSettingsBuffer)) {
          return Promise.reject('Invalid assignment settings file!');
        }

      } else {
        assignmentSettingsBuffer = readFileSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + SETTING_FILE);
        if (!isJson(assignmentSettingsBuffer)) {
          return Promise.reject('Invalid assignment settings file!');
        }
      }
      const assignmentSettingsInfo: AssignmentSettingsInfo = JSON.parse(assignmentSettingsBuffer.toString());
      if (!assignmentSettingsInfo.isCreated) {
        return Promise.reject('Operation not permitted on this type of assignment!');
      }

      if (updateRequest.studentDetails.length !== updateRequest.files.length) {
        return Promise.reject( `Student details is not equal to number of files sent!`);
      }

      const grades = await csvtojson({
        noheader: true,
        trim: false
      }).fromFile(
        (updateRequest.workspace === 'Default Workspace' || isNil(updateRequest.workspace)) ?
          config.defaultPath + sep + assignmentName + sep + GRADES_FILE :
          config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + GRADES_FILE);

      let count = 0;
      const headers = `'${assignmentName}','SCORE_GRADE_TYPE'\n`;
      const line = `''\n`;
      const subheaders = `'Display ID','ID','Last Name','First Name','Mark','Submission date','Late submission'\n`;
      let csvString = headers + line + subheaders;
      for (const studentInfo of updateRequest.studentDetails) {
        const file: any = updateRequest.files[count];
        const studentFolder = studentInfo.studentSurname.toUpperCase() + ', ' + studentInfo.studentName.toUpperCase() + '(' + studentInfo.studentId.toUpperCase() + ')';
        const feedbackFolder = studentFolder + sep + FEEDBACK_FOLDER;
        const submissionFolder = studentFolder + sep + SUBMISSION_FOLDER;
        let csvData = '';

        if (updateRequest.workspace === 'Default Workspace' || isNil(updateRequest.workspace)) {
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
            const filename = basename(file);
            mkdirSync(config.defaultPath + sep + assignmentName + sep + feedbackFolder, {recursive: true});
            mkdirSync(config.defaultPath + sep + assignmentName + sep + submissionFolder, {recursive: true});

            const content = readFileSync(file);
            const pdfDoc = await PDFDocument.load(content);
            const pdfBytes = await pdfDoc.save();
            await writeFileSync(config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + filename, pdfBytes);
            // copyFileSync(file.path, config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + file.originalname);
            csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
          }
        } else {
          if (existsSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + studentFolder)) {
            if (studentInfo.remove) {
              deleteFolderRecursive(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + studentFolder);
            } else {
              const studentRecord = grades.find(grade => grade[Object.keys(grades[0])[0]] === studentInfo.studentId.toUpperCase());
              if (studentRecord) {
                csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},${studentRecord.field5},,\n`;
              } else {
                csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
              }
            }
          } else {
            const filename = basename(file);
            mkdirSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + feedbackFolder, {recursive: true});
            mkdirSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + submissionFolder, {recursive: true});

            const content = readFileSync(file);
            const pdfDoc = await PDFDocument.load(content);
            const pdfBytes = await pdfDoc.save();
            await writeFileSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + submissionFolder + sep + filename, pdfBytes);
            // copyFileSync(file.path, config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + file.originalname);
            csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
          }
        }
        csvString += csvData;
        count++;
      }

      //
      if (updateRequest.workspace === 'Default Workspace' || isNil(updateRequest.workspace)) {
        writeFileSync(config.defaultPath + sep + assignmentName + sep + GRADES_FILE, csvString);
        // writeFileSync(config.defaultPath + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
        const files = glob.sync(config.defaultPath + sep + assignmentName + sep + '/**');
        files.sort((a, b) => (a > b) ? 1 : -1);
        const folderModel = hierarchyModel(files, config.defaultPath);
        return folderModel;
      } else {
        writeFileSync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + GRADES_FILE, csvString);
        // writeFileSync(config.defaultPath + sep + req.body.workspace + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
        const files = glob.sync(config.defaultPath + sep + updateRequest.workspace + sep + assignmentName + sep + '/**');
        files.sort((a, b) => (a > b) ? 1 : -1);
        const folderModel = hierarchyModel(files, config.defaultPath + sep + updateRequest.workspace);
        return folderModel;
      }

    });
  } catch (e) {
    return Promise.reject(e.message);
  }
}
