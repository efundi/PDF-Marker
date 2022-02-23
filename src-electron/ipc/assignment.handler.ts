import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
  rmSync,
  mkdtempSync, lstatSync
} from 'fs';
import * as glob from 'glob';
import {getConfig} from './config.handler';
import {
  checkAccess,
  deleteFolderRecursive,
  hierarchyModel,
  isFolder,
  isJson,
  isNullOrUndefined,
  writeToFile
} from '../utils';
import {
  COMMENTS_FILE,
  CONFIG_DIR,
  COULD_NOT_READ_RUBRIC_LIST,
  FEEDBACK_FOLDER,
  GRADES_FILE,
  INVALID_PATH_PROVIDED,
  INVALID_RUBRIC_JSON_FILE,
  INVALID_STUDENT_FOLDER,
  MARK_FILE,
  NOT_PROVIDED_RUBRIC,
  RUBRICS_FILE,
  SETTING_FILE,
  SUBMISSION_FOLDER
} from '../constants';
import * as path from 'path';
import {basename, dirname, sep} from 'path';
import {json2csvAsync} from 'json-2-csv';
import {access, readFile} from 'fs/promises';
import {find, forEach, isNil} from 'lodash';
import {IpcMainInvokeEvent} from 'electron';
import {UpdateAssignment} from '@shared/info-objects/update-assignment';
import {PDFDocument} from 'pdf-lib';
import {IRubric} from '@shared/info-objects/rubric.class';
import {CreateAssignmentInfo, StudentInfo} from '@shared/info-objects/create-assignment.info';
import {annotatePdfFile} from '../pdf/marking-annotations';
import {IComment} from '@shared/info-objects/comment.class';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {annotatePdfRubric} from '../pdf/rubric-annotations';
import {ShareAssignments} from '@shared/info-objects/share-assignments';
import * as os from 'os';
import {copySync} from 'fs-extra';
import {getAssignmentDirectory} from './workspace.handler';
import {PdfmConstants} from '@shared/constants/pdfm.constants';

const zipDir = require('zip-dir');

const csvtojson = require('csvtojson');

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
      if (updateRequest.workspace === PdfmConstants.DEFAULT_WORKSPACE || isNil(updateRequest.workspace)) {
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
        (updateRequest.workspace === PdfmConstants.DEFAULT_WORKSPACE || isNil(updateRequest.workspace)) ?
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

        if (updateRequest.workspace === PdfmConstants.DEFAULT_WORKSPACE || isNil(updateRequest.workspace)) {
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
      if (updateRequest.workspace === PdfmConstants.DEFAULT_WORKSPACE || isNil(updateRequest.workspace)) {
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



export function createAssignment(event: IpcMainInvokeEvent, createInfo: CreateAssignmentInfo): Promise<any> {

  if (createInfo.assignmentName.length < 5) {
    return Promise.reject(`Assignment must be > 5 characters`);
  }

  let assignmentName: string = createInfo.assignmentName.trim();

  try {
    return getConfig().then(async (config) => {
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

      const noRubric: boolean = createInfo.noRubric;
      let rubricName: string;
      let rubric: IRubric = null;
      let rubricIndex: number;
      let rubrics: IRubric[];

      if (!noRubric) {
        if (isNil(createInfo.rubric)) {
          return Promise.reject(NOT_PROVIDED_RUBRIC);
        }

        rubricName = createInfo.rubric.trim();
        if (!isNullOrUndefined(rubricName)) {
          const rubricData = readFileSync(CONFIG_DIR + RUBRICS_FILE);
          try {
            if (!isJson(rubricData)) {
              return Promise.reject(INVALID_RUBRIC_JSON_FILE);
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
              return Promise.reject(COULD_NOT_READ_RUBRIC_LIST);
            }

          } catch (e) {
            return Promise.reject(e.message);
          }
        }
      }
      const studentDetails: StudentInfo[] = createInfo.studentRow;

      if (!Array.isArray(studentDetails)) {
        return Promise.reject(`Student details must be a list`);
      }

      if (studentDetails.length !== createInfo.files.length) {
        return Promise.reject(`Student details is not equal to number of files sent!`);
      }

      const settings: AssignmentSettingsInfo = {defaultColour: '#6F327A', rubric, isCreated: true};

      let count = 0;
      const headers = `'${assignmentName}','SCORE_GRADE_TYPE'\n`;
      const line = `''\n`;
      const subheaders = `'Display ID','ID','Last Name','First Name','Mark','Submission date','Late submission'\n`;
      let csvString = headers + line + subheaders;
      for (const studentInfo of studentDetails) {
        const file: any = createInfo.files[count];
        const studentFolder = studentInfo.studentSurname.toUpperCase() + ', ' + studentInfo.studentName.toUpperCase() + '(' + studentInfo.studentId.toUpperCase() + ')';
        const feedbackFolder = studentFolder + sep + FEEDBACK_FOLDER;
        const submissionFolder = studentFolder + sep + SUBMISSION_FOLDER;
        const csvData = `${studentInfo.studentId.toUpperCase()},${studentInfo.studentId.toUpperCase()},${studentInfo.studentSurname.toUpperCase()},${studentInfo.studentName.toUpperCase()},,,\n`;
        csvString += csvData;

        if (createInfo.workspace === PdfmConstants.DEFAULT_WORKSPACE || isNil(createInfo.workspace)) {
          const filename = basename(file);
          mkdirSync(config.defaultPath + sep + assignmentName + sep + feedbackFolder, {recursive: true});
          mkdirSync(config.defaultPath + sep + assignmentName + sep + submissionFolder, {recursive: true});
          const content = readFileSync(file);
          const pdfDoc = await PDFDocument.load(content);
          const pdfBytes = await pdfDoc.save();
          await writeFileSync(config.defaultPath + sep + assignmentName + sep + submissionFolder + sep + filename, pdfBytes);
          count++;
        } else {
          const filename = basename(file);
          mkdirSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + feedbackFolder, {recursive: true});
          mkdirSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + submissionFolder, {recursive: true});
          const content = readFileSync(file);
          const pdfDoc = await PDFDocument.load(content);
          const pdfBytes = await pdfDoc.save();
          await writeFileSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + submissionFolder + sep + filename, pdfBytes);
          count++;
        }
      }

      if (createInfo.workspace === PdfmConstants.DEFAULT_WORKSPACE || isNil(createInfo.workspace)) {
        writeFileSync(config.defaultPath + sep + assignmentName + sep + GRADES_FILE, csvString);
        writeFileSync(config.defaultPath + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
        const files = glob.sync(config.defaultPath + sep + assignmentName + sep + '/**');
        files.sort((a, b) => (a > b) ? 1 : -1);
        const folderModel = hierarchyModel(files, config.defaultPath);
        return folderModel;
      } else {
        writeFileSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + GRADES_FILE, csvString);
        writeFileSync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + SETTING_FILE, JSON.stringify(settings));
        const files = glob.sync(config.defaultPath + sep + createInfo.workspace + sep + assignmentName + sep + '/**');
        files.sort((a, b) => (a > b) ? 1 : -1);
        const folderModel = hierarchyModel(files, config.defaultPath + sep + createInfo.workspace);
        return folderModel;
      }

    });
  } catch (e) {
    return Promise.reject(e.message);
  }
}



export function getGrades(event: IpcMainInvokeEvent, location: string): Promise<any> {

  return getConfig().then((config) => {
    const loc = location.replace(/\//g, sep);
    const assignmentFolder = config.defaultPath + sep + loc;

    return checkAccess(assignmentFolder + sep + GRADES_FILE).then(() => {
      return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE);
    });
  });
}



export function getAssignmentGlobalSettings(event: IpcMainInvokeEvent, location: string): Promise<any> {
  return getConfig().then((config) => {
    const loc = location.replace(/\//g, sep);

    const assignmentFolder = config.defaultPath + sep + loc;

    return access(assignmentFolder + sep + '.settings.json', constants.F_OK).then(() => {
      return (assignmentFolder + sep + '.settings.json');
    }, (err) => {
      return Promise.reject({message: 'Could not read settings file'});
    });
  });
}




export function finalizeAssignment(event: IpcMainInvokeEvent, workspaceFolder: string, location: string): Promise<any> {
  try {
    return getConfig().then((config) => {
      const loc = location.replace(/\//g, sep);
      if (workspaceFolder) {
        workspaceFolder = workspaceFolder.replace(/\//g, sep);
      } else {
        workspaceFolder = '';
      }
      const assignmentFolder = (workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ? config.defaultPath + sep + workspaceFolder + sep + loc : config.defaultPath + sep + loc;
      return csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE).then((gradesJSON) => {
        const files = glob.sync(assignmentFolder + sep + '/*');
        const promises: Promise<any>[] = files.map((file) => {
          if (statSync(file).isDirectory()) {
            const regEx = /(.*)\((.+)\)$/;
            if (!regEx.test(file)) {
              return Promise.reject(INVALID_STUDENT_FOLDER + ' ' + basename(file));
            }

            const matches = regEx.exec(file);

            const submissionFiles = glob.sync(file + sep + SUBMISSION_FOLDER + '/*');

            const submissionPromisses: Promise<any>[] = submissionFiles.map((submission) => {
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
                  const ext = path.extname(submission);
                  let fileName = path.basename(submission, ext);
                  return annotatePdfFile(submission, marks).then(async (data) => {
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
                      }
                    }
                    if (changed) {
                      return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false})
                        .then(csv => {
                          writeFileSync(assignmentFolder + sep + GRADES_FILE, csv);
                        }, () => {
                          return Promise.reject( 'Failed to save marks to ' + GRADES_FILE + ' file for student ' + matches[2] + '!');
                        });
                    } else {
                      return Promise.reject('Failed to save mark');
                    }
                  }, (error) => {
                    return Promise.reject('Error annotating marks to PDF ' + fileName + ' [' + error.message + ']');
                  });
                }
              } catch (e) {
                return Promise.reject(e.message);
              }
            });

            return Promise.all(submissionPromisses);
          }
        });
        return Promise.all(promises).then(() => {
          return zipDir((workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ? config.defaultPath + sep + workspaceFolder : config.defaultPath,
            {filter: (path: string, stat) => (!(/\.marks\.json|\.settings\.json|\.zip$/.test(path)) && ((path.endsWith(assignmentFolder)) ? true : (path.startsWith((assignmentFolder) + sep))))})
            .then((buffer) => {
              return buffer;
            }, (err) => {
              return Promise.reject('Could not export assignment');
            });
        });
      });
    });
  } catch (e) {
    return Promise.reject(e.message);
  }
}




export function finalizeAssignmentRubric(event: IpcMainInvokeEvent, workspaceFolder: string, location: string, rubricName: string): Promise<any> {
  try {
    return getConfig().then(async (config) => {
      const loc = location.replace(/\//g, sep);
      if (workspaceFolder) {
        workspaceFolder = workspaceFolder.replace(/\//g, sep);
      } else {
        workspaceFolder = '';
      }
      const assignmentFolder = (workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ?
        config.defaultPath + sep + workspaceFolder + sep + loc : config.defaultPath + sep + loc;
      const gradesJSON = await csvtojson({noheader: true, trim: false}).fromFile(assignmentFolder + sep + GRADES_FILE);
      const files = glob.sync(assignmentFolder + sep + '/*');
      const assignmentSettingsBuffer = readFileSync(assignmentFolder + sep + SETTING_FILE);
      if (!isJson(assignmentSettingsBuffer)) {
        return Promise.reject('Invalid assignment settings file!');
      }

      const assignmentSettingsInfo: AssignmentSettingsInfo = JSON.parse(assignmentSettingsBuffer.toString());

      const promises: Promise<any>[] = files.map((file) => {
        if (statSync(file).isDirectory()) {
          const regEx = /(.*)\((.+)\)$/;
          if (!regEx.test(file)) {
            return Promise.reject(INVALID_STUDENT_FOLDER + ' ' + basename(file));
          }

          const matches = regEx.exec(file);

          const submissionFiles = glob.sync(file + sep + SUBMISSION_FOLDER + '/*');
          rubricName = rubricName.trim();

          if (isNullOrUndefined(assignmentSettingsInfo.rubric)) {
            return Promise.reject('Assignment\'s settings does not contain a rubric!');
          } else if (assignmentSettingsInfo.rubric.name !== rubricName) {
            return Promise.reject('Assignment\'s settings rubric does not match provided!');
          }

          const rubric = assignmentSettingsInfo.rubric;

          const submissionPromisses: Promise<any>[] = submissionFiles.map((submission) => {
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
                return annotatePdfRubric(submission, marks, assignmentSettingsInfo.rubric).then(async (data) => {
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
                      break;
                    }
                  }
                  if (changed) {
                    return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false})
                      .then(csv => {
                        writeFileSync(assignmentFolder + sep + GRADES_FILE, csv);
                      })
                      .catch(() => {
                        return Promise.reject('Failed to save marks to ' + GRADES_FILE + ' file for student ' + matches[2] + '!');
                      });
                  } else {
                    return Promise.reject('Failed to save mark');
                  }
                }, (error) => {
                  return Promise.reject('Error annotating marks to PDF [' + error.message + ']');
                });
              }
            } catch (e) {
              return Promise.reject(e.message);
            }
          });

          return Promise.all(submissionPromisses);
        }
      });
      return Promise.all(promises).then(() => {
        return zipDir((workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ? config.defaultPath + sep + workspaceFolder : config.defaultPath,
          {filter: (filterPath: string, stat) => (!(/\.marks\.json|.settings.json|\.zip$/.test(filterPath)) && ((filterPath.endsWith(assignmentFolder)) ? true : (filterPath.startsWith(assignmentFolder + sep))))})
          .then((buffer) => {
            return buffer;
          }, (err) => {
            return Promise.reject('Could not export assignment');
          });
      });
    });
  } catch (e) {
    return Promise.reject( e.message);
  }
}


function cleanupTemp(tmpDir: string) {
  try {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true });
    }
  } catch (e) {
    console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
  }
}

export function shareExport(event: IpcMainInvokeEvent, shareRequest: ShareAssignments): Promise<any> {

  try {
    return getConfig().then(async (config) => {
      const assignmentName = shareRequest.assignmentName.replace(/\//g, sep);
      let workspaceFolder = '';
      if (shareRequest.workspaceFolder) {
        workspaceFolder = shareRequest.workspaceFolder.replace(/\//g, sep);
      }
      const originalAssignmentDirectory = (workspaceFolder !== null && workspaceFolder !== '' && workspaceFolder !== undefined) ? config.defaultPath + sep + workspaceFolder + sep + assignmentName : config.defaultPath + sep + assignmentName;
      const gradesJSON = await csvtojson({
        noheader: true,
        trim: false
      }).fromFile(originalAssignmentDirectory + sep + GRADES_FILE);
      let tmpDir;
      // Create a temp directory to construct files to zip
      tmpDir = mkdtempSync(path.join(os.tmpdir(), 'pdfm-'));

      const tempAssignmentDirectory = tmpDir + sep + assignmentName;
      mkdirSync(tempAssignmentDirectory);

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
        const shouldExport = !isNil(find(shareRequest.submissions, (student) => student.studentNumber.toUpperCase() === gradesStudentId.toUpperCase()));
        if (shouldExport) {
          shareGradesJson.push(gradesJSON[i]);
        }
      }

      return json2csvAsync(shareGradesJson, {emptyFieldValue: '', prependHeader: false})
        .then(csv => {
          writeFileSync(tempAssignmentDirectory + sep + GRADES_FILE, csv);
        })
        .then(() => {
          return zipDir(tmpDir);
        })
        .then((buffer) => {
          cleanupTemp(tmpDir);
          return buffer;
        }, (error) => {
          cleanupTemp(tmpDir);
          return Promise.reject(error.message);
        });
    });
  } catch (e) {
    console.error(e);
    return Promise.reject('Error trying to export share');
  }
}




export function rubricUpdate(event: IpcMainInvokeEvent, rubricName: string, assignmentName: string): Promise<IRubric> {

  if (existsSync(CONFIG_DIR + RUBRICS_FILE)) {
    return readFile(CONFIG_DIR + RUBRICS_FILE).then( (data) => {
      if (!isJson(data)) {
        return Promise.reject({message: INVALID_RUBRIC_JSON_FILE});
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
            return Promise.reject({message: 'Could not find rubric'});
          }

          rubric = rubrics[indexFound];
        } else {
          rubric = null;
        }

        return getConfig().then((config) => {
          try {
            const markFiles = glob.sync(config.defaultPath + sep + assignmentName + sep + '/**/' + MARK_FILE);
            markFiles.forEach(markFile => {
              unlinkSync(markFile);
            });
            return readFile( config.defaultPath + sep + assignmentName + sep + SETTING_FILE).then( (assignmentSettingsBuffer) => {
              if (!isJson(assignmentSettingsBuffer)) {
                return Promise.reject('invalid assignment settings');
              }

              const assignmentSettingsInfo: AssignmentSettingsInfo = JSON.parse(assignmentSettingsBuffer.toString());
              assignmentSettingsInfo.rubric = rubric;

              return writeToFile( config.defaultPath + sep + assignmentName + sep + SETTING_FILE,
                JSON.stringify(assignmentSettingsInfo), null, null).then(() => {

                return checkAccess(config.defaultPath + sep + assignmentName + sep + GRADES_FILE).then(() => {
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
                        return json2csvAsync(gradesJSON, {emptyFieldValue: '', prependHeader: false}).then( ( csv) => {
                          return writeToFile(config.defaultPath + sep + assignmentName + sep + GRADES_FILE, csv, 'Successfully saved marks!', 'Failed to save marks to ' + GRADES_FILE + ' file!').then(() => {
                            return assignmentSettingsInfo.rubric;
                          });
                        }, (err) => {
                          return Promise.reject('Failed to convert json to csv!');
                        });
                      } else {
                        return Promise.reject('Failed to save mark');
                      }
                    }, reason => {
                      return Promise.reject( reason);
                    });
                });
              });
            });
          } catch (e) {
            return Promise.reject(e.message);
          }
        });
      }
    });
  }
  return Promise.reject({message: COULD_NOT_READ_RUBRIC_LIST});
}


export function getPdfFile(event: IpcMainInvokeEvent, location: string): Promise<Uint8Array> {
  return getConfig().then((config) => {
    const loc = location.replace(/\//g, sep);
    const actualPath = config.defaultPath + sep + loc;

    return checkAccess(actualPath).then(() => {
      return readFile(actualPath);
    });
  });
}

function countFileFilter(startPath: any, filter: string): number {
  let count = 0;

  if (!existsSync(startPath)) {
    return 0;
  }

  const files = readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = lstatSync(filename);
    if (stat.isDirectory()) {
      count = count + countFileFilter(filename, filter);
    } else if (filename.indexOf(filter) >= 0) {
      count = count + 1;
    }
  }
  return count;
}

export function getMarkedAssignmentsCount(event: IpcMainInvokeEvent, workingFolder: string, assignmentName: string): Promise<number> {
  return getAssignmentDirectory(workingFolder, assignmentName).then((assignmentDirectory) => {
    return countFileFilter(assignmentDirectory, '.marks.json');
  });
}
