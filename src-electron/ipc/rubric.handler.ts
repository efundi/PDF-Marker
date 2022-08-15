import {BrowserWindow, dialog, IpcMainInvokeEvent} from 'electron';
import {isBlank, isJson, joinError} from '../utils';
import {IRubric, IRubricName, SelectedRubric} from '@shared/info-objects/rubric.class';
import {existsSync, readFileSync} from 'fs';
import {mkdir, readFile, writeFile} from 'fs/promises';
import {isNil, noop} from 'lodash';
import {basename, extname, sep} from 'path';
import {
  CONFIG_DIR,
  COULD_NOT_CREATE_CONFIG_DIRECTORY,
  COULD_NOT_CREATE_RUBRIC_FILE,
  COULD_NOT_READ_RUBRIC_LIST, EXTRACTED_ZIP, EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC,
  INVALID_RUBRIC_JSON_FILE,
  NOT_CONFIGURED_CONFIG_DIRECTORY,
  RUBRICS_FILE,
} from '../constants';
import * as glob from 'glob';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {getConfig} from './config.handler';
import {SETTING_FILE} from '@shared/constants/constants';

const excelParser = new (require('simple-excel-to-json').XlsParser)();

export function selectRubricFile(): Promise<SelectedRubric> {
  return dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    title: 'Select File',
    filters: [
      { name: 'Custom Files', extensions: ['xlsx', 'xls'] }
    ],
    properties: ['openFile']
  }).then((data) => {
    if (data.canceled) {
      return Promise.reject();
    } else {
      try {
        const doc = excelParser.parseXls2Json(data.filePaths[0], { isNested: true });
        const docInJSON = doc[0] || [];

        if (docInJSON.length === 0) {
          return Promise.reject(`No criteria(s) provided`);
        } else {
          let rowCount = 4;
          const levelCount = 6;
          let errorMessage: string;
          let errorFound: boolean;
          let validLevelLength = 0;
          const startMessagePrefix = `Error[row = `;
          const startMessageSuffix = `]: `;
          const notProvided = `is not provided`;
          const ext = extname(data.filePaths[0]);
          const fileName = basename(data.filePaths[0], ext);

          const rubric: IRubric = {
            criterias: [],
            name: fileName
          };

          for (let index = 0; index < docInJSON.length; index++) {
            if (index > 1) {
              const criteriaData = docInJSON[index];

              errorMessage = '';
              errorFound = false;

              if (isBlank(criteriaData.Criterion_name)) {
                errorMessage = joinError(errorMessage, `Criteria name ${notProvided}`);
                errorFound = true;
              }

              if (isBlank(criteriaData.Criterion_description)) {
                errorMessage = joinError(errorMessage, `Criteria description ${notProvided}`);
                errorFound = true;
              }

              if (errorFound && index === 2) {
                return Promise.reject(errorMessage);
              } else if (errorFound) {
                return { selectedPath: data.filePaths[0], rubric: rubric};
              }

              const levels = [];

              for (let i = 1; ((validLevelLength === 0) ? levelCount : validLevelLength); i++) {
                const achievementMark = 'Achievement_level_'  + i + '_mark';
                const achievementFeedback = 'Achievement_level_'  + i + '_feedback';
                const achievementTitle = 'Achievement_level_'  + i + '_title';

                if (isBlank(criteriaData[achievementMark])) {
                  errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}${achievementMark} ${notProvided}`);
                  errorFound = true;
                }

                if (isNaN(criteriaData[achievementMark])) {
                  errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}${achievementMark} is not a valid number`);
                  errorFound = true;
                }

                criteriaData[achievementMark] = parseInt('' + criteriaData[achievementMark], 10);

                if (isBlank(criteriaData[achievementTitle])) {
                  errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}${achievementTitle} ${notProvided}`);
                  errorFound = true;
                }

                if (isBlank(criteriaData[achievementFeedback])) {
                  errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix}${achievementFeedback} ${notProvided}`);
                  errorFound = true;
                }

                if (errorFound && i === 1) {
                  return Promise.reject(errorMessage);
                } else if (errorFound && i > 1) {
                  if (index === 2) {
                    validLevelLength = i - 1;
                  }
                  break;
                } else if ((index === 2) && (i === levelCount)) {
                  validLevelLength = levelCount;
                }

                levels[i - 1] = {
                  score: criteriaData[achievementMark],
                  description: criteriaData[achievementFeedback].trim(),
                  label: criteriaData[achievementTitle].trim()
                };
              }

              if (index !== 2 && levels.length !== validLevelLength) {
                errorMessage = joinError(errorMessage, `${startMessagePrefix}${rowCount}${startMessageSuffix} The provided number of achievement levels do not match first row achievement levels`);
                return Promise.reject( errorMessage);
              }

              rubric.criterias.push({
                description: criteriaData.Criterion_description,
                name: criteriaData.Criterion_name,
                levels
              });

              rowCount++;
            }
          }

          if (rubric.criterias.length === 0) {
            return Promise.reject( `No criteria(s) provided`);
          } else {
            return { selectedPath: data.filePaths[0], rubric: rubric};
          }
        }
      } catch (reason) {
        return Promise.reject(reason);
      }
    }
  }, reason => {
    return Promise.reject(reason);
  });
}

export function getRubrics(): Promise<IRubric[]> {
  if (existsSync(CONFIG_DIR + RUBRICS_FILE)) {
    return readFile(CONFIG_DIR + RUBRICS_FILE).then((data) => {
      if (!isJson(data)) {
        return Promise.reject(INVALID_RUBRIC_JSON_FILE);
      }

      const rubrics: IRubric[] = JSON.parse(data.toString());
      if (!Array.isArray(rubrics)) {
        Promise.reject(COULD_NOT_READ_RUBRIC_LIST);
      }

      return rubrics;
    }, (error) => {
      return Promise.reject('Failed to read file containing list of rubrics!');
    });
  } else {
    return Promise.resolve([]);
  }
}


export function rubricUpload(event: IpcMainInvokeEvent, rubric: IRubric): Promise<IRubricName[]> {

  return getRubrics().then((rubrics) => {
    let foundCount = 0;

    const clonedRubrics = [...rubrics];
    clonedRubrics.sort((a, b) => (a.name > b.name) ? 1 : -1);

    for (let i = 0; i < clonedRubrics.length; i++) {
      if (clonedRubrics[i].name.toLowerCase() === rubric.name.toLowerCase()) {
        foundCount++;
      } else if (clonedRubrics[i].name.toLowerCase() === (rubric.name.toLowerCase() + ' (' + (foundCount + 1) + ')')) {
        foundCount++;
      }
    }

    if (foundCount !== 0) {
      rubric.name = rubric.name + ' (' + (foundCount + 1) + ')';
    }

    rubrics.unshift(rubric);
    return writeRubricFile(rubrics)
      .then(r => toRubricNames(r));
  });
}

export function writeRubricFile(rubricData: IRubric[]): Promise<IRubric[]> {
  let promise: Promise<any> = Promise.resolve();
  if (!existsSync(CONFIG_DIR)) {
    promise = mkdir(CONFIG_DIR).then(noop, err => {
      return Promise.reject(COULD_NOT_CREATE_CONFIG_DIRECTORY);
    });
  }
  return promise.then(() => {
    return writeFile(CONFIG_DIR + RUBRICS_FILE, JSON.stringify(rubricData));
  }).then(() => rubricData, (err) => {
      return Promise.reject(COULD_NOT_CREATE_RUBRIC_FILE);
    });
}

function toRubricNames(rubrics: IRubric[]): Promise<IRubricName[]> {
  const rubricNames: IRubricName[] = [];
  if (Array.isArray(rubrics)) {
    rubrics.forEach(rubric => {
      const rubricName = {name: rubric.name, inUse: (rubric.inUse) ? rubric.inUse : false};
      rubricNames.push(rubricName);
    });
    return Promise.resolve(rubricNames);
  }
  return writeRubricFile([]);
}



export function getRubricNames(): Promise<IRubricName[]> {
  return getRubrics().then((rubrics) => toRubricNames(rubrics));
}


export function deleteRubricCheck(event: IpcMainInvokeEvent, rubricName: string): Promise<boolean> {
  rubricName = rubricName.trim();

  return getConfig().then((config) => {
    try {
      const folders: string[] = glob.sync(config.defaultPath + sep + '*');
      let found = false;
      folders.forEach(folder => {
        const settingFileContents = existsSync(folder + sep + SETTING_FILE) ? readFileSync(folder + sep + SETTING_FILE) : null;
        if (settingFileContents != null) {
          if (!isJson(settingFileContents)) {
            return Promise.reject(NOT_CONFIGURED_CONFIG_DIRECTORY);
          }
          const settings: AssignmentSettingsInfo = JSON.parse(settingFileContents.toString());

          if (settings.rubric && settings.rubric.name.toLowerCase() === rubricName.toLowerCase()) {
            found = true;
          }
        }
      });

      return found;
    } catch (e) {
      return Promise.reject(e.message);
    }
  });
}



export function deleteRubric(event: IpcMainInvokeEvent, rubricName: string): Promise<IRubricName[]> {
  rubricName = rubricName.trim();
  return getRubrics().then((rubrics) => {
    let indexFound = -1;

    for (let i = 0; i < rubrics.length; i++) {
      if (rubrics[i].name.toLowerCase() === rubricName.toLowerCase()) {
        indexFound = i;
        break;
      }
    }

    if (indexFound === -1) {
      return Promise.reject('Could not find rubric');
    } else {
      rubrics.splice(indexFound, 1);
    }

    return writeRubricFile(rubrics);
  });
}

export function markRubricInUse(rubricName: string): Promise<any>{
  return getRubrics().then((rubrics) => {
    const rubricIndex = rubrics.findIndex(r => r.name === rubricName);
    rubrics[rubricIndex].inUse = true;
    return writeRubricFile(rubrics).then(() => {
      return EXTRACTED_ZIP;
    });
  });
}

export function findRubric(rubricName: string): Promise<IRubric> {
  return getRubrics().then((rubrics) => {
    const rubric = rubrics.find(r => r.name.toLowerCase() === rubricName.toLowerCase());

    if (isNil(rubric)) {
      return Promise.reject('Could not find rubric');
    }

    return rubric;
  });
}

export function getRubric(event: IpcMainInvokeEvent, rubricName: string): Promise<IRubric> {
  return findRubric(rubricName);
}
