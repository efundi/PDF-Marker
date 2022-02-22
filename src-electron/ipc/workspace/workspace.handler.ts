import {isNil} from "lodash";
import {getConfig} from "../config/config";
import {sep} from "path";
import {writeFile} from "fs/promises";
import {SETTING_FILE} from "../../constants";


export function getWorkingDirectory(workspaceName: string): Promise<string>{
  return getConfig().then((config) => {
    if (workspaceName === 'Default Workspace' || isNil(workspaceName)) {
      return config.defaultPath;
    } else {
      return config.defaultPath + sep + workspaceName;
    }
  });
}

export function getAssignmentDirectory(workspaceName: string, assignmentName: string): Promise<string>{
  return getWorkingDirectory(workspaceName).then((workingDirectory) => {
    return workingDirectory + sep + assignmentName;
  });
}

export function writeAssignmentSettings(workspaceName: string, assignmentName: string, settings: any): Promise<any>{
    return getAssignmentDirectory(workspaceName, assignmentName).then((workingDirectory) => {
      return writeFile(workingDirectory + sep + SETTING_FILE, JSON.stringify(settings));
    }).then(() => settings);
}
