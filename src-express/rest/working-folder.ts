import {validationResult} from 'express-validator';
import {existsSync, mkdirSync, readdirSync, readFile, readFileSync, renameSync, rmdirSync, writeFileSync} from 'fs';
import {sep, basename} from 'path';
import {
  CONFIG_DIR,
  CONFIG_FILE, COULD_NOT_READ_COMMENT_LIST, COULD_NOT_READ_WORKSPACE_LIST,
  FORBIDDEN_RESOURCE, NOT_CONFIGURED_CONFIG_DIRECTORY,
  NOT_PROVIDED_NEW_WORKSPACE_NAME,
  NOT_PROVIDED_WORKSPACE_NAME
} from '../constants';
import {
  checkClient,
  isJson,
  isNullOrUndefined,
  readFromFile,
  sendResponse,
  sendResponseData,
  writeToFile
} from '../utils';
import * as fse from 'fs-extra';
import * as trash from 'trash';
import {SettingInfo} from "../../src/app/modules/pdf-marker/info-objects/setting.info";
import {forEach} from 'lodash';

export const createWorkingFolder = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  const configData = readFileSync(CONFIG_DIR + CONFIG_FILE);
  const config: SettingInfo = JSON.parse(configData.toString());
  if (!existsSync(config.defaultPath + sep + req.body.workingFolders)) {
    mkdirSync(config.defaultPath + sep + req.body.workingFolders);
  } else {
    return res.status(404).send({message: 'Folder with name \'' + req.body.workingFolders + '\' already exists.'});
  }
  console.log(config);
  if (isNullOrUndefined(config.folders)) {
    config.folders = [];
  }
  config.folders.push(config.defaultPath + sep + req.body.workingFolders);
  console.log(config);
  return writeToFile(req, res, CONFIG_DIR + CONFIG_FILE, JSON.stringify(config));
};


export const updateWorkspaceName = (req, res) => {
  if (!checkClient(req, res)) {
    return res.status(401).send({message: FORBIDDEN_RESOURCE});
  }
  if (!req.body.workspaceName) {
    return res.status(400).send({message: NOT_PROVIDED_WORKSPACE_NAME});
  }
  if (!req.body.newWorkspaceName) {
    return res.status(400).send({message: NOT_PROVIDED_NEW_WORKSPACE_NAME});
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array()});
  }
  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err) {
      return res.status(500).send({message: 'Failed to read configurations!'});
    }

    if (!isJson(data)) {
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});
    }
    const config = JSON.parse(data.toString());
    const folders = config.folders;
    const workspaceName: string = req.body.workspaceName;
    const newWorkspaceName: string = req.body.newWorkspaceName;
    const currPath = config.defaultPath + sep + workspaceName;
    const newPath = config.defaultPath + sep + newWorkspaceName;
    if (existsSync(newPath)) {
      return res.status(500).send({message: 'Folder name already exists.'});
    }
    try {
      renameSync(currPath, newPath);
      console.log('Successfully renamed the directory.');
      const foundIndex = folders.findIndex(x => x === currPath);
      folders[foundIndex] = newPath;
      config.folders = folders;
      writeFileSync(CONFIG_DIR + CONFIG_FILE, JSON.stringify(config));
      return res.status(200).send({message: 'Successfully renamed the directory.'});
    } catch (e) {
      console.log(e);
      return res.status(500).send({message:  e.message});

    }

  });
};



export const moveWorkspaceAssignments = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (isNullOrUndefined(req.body.workspaceName)) {
    return sendResponse(req, res, 400, 'Workspace location not provided');
  }

  const assignments = Array.isArray(req.body.assignments) ? req.body.assignments : [];
  if (!isNullOrUndefined(assignments)) {
    return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
      if (!isJson(data)) {
        return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
      }
      const config = JSON.parse(data.toString());
      const loc = req.body.currentWorkspaceName.replace(/\//g, sep);
      const isDefault: boolean = req.body.workspaceName === 'Default Workspace';
      const loc2 = req.body.workspaceName.replace(/\//g, sep);

      const workspacePath = config.defaultPath + sep + loc;
      const newWorkspacePath = isDefault ? config.defaultPath : config.defaultPath + sep + loc2;
      let failed = false;
      forEach(assignments, (assignment) => {
        const assignmentPath = workspacePath + sep + assignment.assignmentTitle;
        const newAssignmentPath = newWorkspacePath + sep + assignment.assignmentTitle;
        if (!existsSync(newAssignmentPath)) {
          try {
            const src = assignmentPath;
            const dest = newAssignmentPath;
            fse.move(src, dest);
          } catch (e) {
            console.log(e);
            res.status(500).send({message:  e.message});
            return false; // Stop looping
          }
        } else {
          failed = true;
          res.status(500).send({message: 'Assignment with name already exists.'});
          return false; // Stop looping
          // return sendResponse(req, res, 400, 'Assignment with name already exists.');
        }
      });
      if (!failed) {
        return res.status(200).send({message: 'Successfully renamed the directory.'});
      }
    });
  }

};




export const deleteWorkspaceConfirmation = async (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (!req.body.folder) {
    return sendResponse(req, res, 400, NOT_PROVIDED_WORKSPACE_NAME);
  }

  const deleteFolder: string = req.body.folder;

  if (existsSync(CONFIG_DIR + CONFIG_FILE)) {
    return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, async (data) => {
      if (!isJson(data)) {
        return sendResponse(req, res, 400, COULD_NOT_READ_WORKSPACE_LIST);
      }
      const config = JSON.parse(data.toString());
      const folders = config.folders;
      const workspaceNames = folders.map(item => {
        return basename(item);
      });
      if (Array.isArray(workspaceNames)) {
        let indexFound = -1;
        for (let i = 0; i < workspaceNames.length; i++) {
          if (workspaceNames[i].toUpperCase() === deleteFolder.toUpperCase()) {
            indexFound = i;
            break;
          }
        }

        if (indexFound === -1) {
          return sendResponse(req, res, 404, 'Could not find folder ' + deleteFolder);
        }

        if (existsSync(folders[indexFound])) {
          try {
            await moveToRecycleBin(folders[indexFound]);
          } catch (e) {
            return sendResponse(req, res, 500, e);
          }
        }
        folders.splice(indexFound, 1);
        config.folders = folders;
        try {
          writeFileSync(CONFIG_DIR + CONFIG_FILE, JSON.stringify(config));
        } catch (e) {
          return sendResponse(req, res, 500, COULD_NOT_READ_COMMENT_LIST);
        }

        return sendResponseData(req, res, 200, folders);
      }
    });
  }
  return sendResponseData(req, res, 500, []);
};



export const deleteWorkspaceCheck = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (!req.body.folder) {
    return sendResponse(req, res, 400, NOT_PROVIDED_WORKSPACE_NAME);
  }

  const deleteFolder: string = req.body.folder;
  let found = false;
  let hasAssignments = false;

  return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }
    const config = JSON.parse(data.toString());
    const workspaces: string[] = config.folders;
    const workspaceNames = workspaces.map(item => {
      return basename(item);
    });
    const currPath = config.defaultPath + sep + deleteFolder;
    try {
      for (let i = 0; i < workspaceNames.length; i++) {
        if (workspaceNames[i].toUpperCase() === deleteFolder.toUpperCase()) {
          found = true;
          break;
        }
      }
      // Check if there are assignments in folder
      if (found) {
        const folders: string[] = readdirSync(currPath);
        if (folders.length > 0) {
          hasAssignments = true;
        }
      }
      return sendResponseData(req, res, 200, hasAssignments);
    } catch (e) {
      return sendResponse(req, res, 500, e.message);
    }
  });
};

export const getWorkspaces = (req, res) => {
  if (!checkClient(req, res)) {
    return res.status(401).send({message: 'Forbidden access to resource!'});
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array()});
  }
  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err) {
      return res.status(500).send({message: 'Failed to read configurations!'});
    }

    if (!isJson(data)) {
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});
    }

    const folders = JSON.parse(data.toString()).folders;
    return sendResponseData(req, res, 200, folders);

  });
};


const moveToRecycleBin = async (path) => {
  if (existsSync(path)) {
    const files = readdirSync(path);
    if (files.length > 0) {
      const assignmentFolder = files[0];
      const assignmentPath = path + sep + assignmentFolder;
      // Send assignments to recyclebin
      await trash(assignmentPath);
    }
    // Hard delete workspace folder
    rmdirSync(path);
  }
};
