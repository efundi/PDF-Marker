/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src-electron/constants.ts":
/*!***********************************!*\
  !*** ./src-electron/constants.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.STUDENT_DIRECTORY_NO_NAME_REGEX = exports.STUDENT_DIRECTORY_REGEX = exports.STUDENT_DIRECTORY_ID_REGEX = exports.HIGHLIGHT_HEIGHT = exports.NOT_PROVIDED_COMMENT = exports.COULD_NOT_READ_COMMENT_LIST = exports.INVALID_STUDENT_FOLDER = exports.EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC = exports.EXTRACTED_ZIP = exports.NOT_CONFIGURED_CONFIG_DIRECTORY = exports.COULD_NOT_CREATE_CONFIG_DIRECTORY = exports.NOT_PROVIDED_RUBRIC = exports.COULD_NOT_READ_RUBRIC_LIST = exports.COULD_NOT_CREATE_RUBRIC_FILE = exports.INVALID_RUBRIC_JSON_FILE = exports.COMMENTS_FILE = exports.CONFIG_DIR = exports.APP_DATA_DIR = exports.RUBRICS_FILE = exports.CONFIG_FILE = void 0;
const path_1 = __webpack_require__(/*! path */ "path");
exports.CONFIG_FILE = 'config.json';
exports.RUBRICS_FILE = 'rubrics.json';
exports.APP_DATA_DIR = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME +
    '/Library/Preferences' : process.env.HOME + '/.local/share');
exports.CONFIG_DIR = exports.APP_DATA_DIR + path_1.sep + 'pdf-config' + path_1.sep;
exports.COMMENTS_FILE = 'comments.json';
/*COMMON MESSAGES*/
exports.INVALID_RUBRIC_JSON_FILE = 'Rubric file is not a valid JSON file!';
exports.COULD_NOT_CREATE_RUBRIC_FILE = 'Failed to read rubric file!';
exports.COULD_NOT_READ_RUBRIC_LIST = 'Could not read list of rubrics!';
exports.NOT_PROVIDED_RUBRIC = 'Rubric must be provided!';
exports.COULD_NOT_CREATE_CONFIG_DIRECTORY = 'Failed to create configuration directory!';
exports.NOT_CONFIGURED_CONFIG_DIRECTORY = 'Configure default location to extract files to on the settings page!';
exports.EXTRACTED_ZIP = 'Successfully extracted assignment to selected workspace!';
exports.EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC = 'Successfully extracted assignment to selected workspace! ' +
    'But Failed to write to rubrics file!';
exports.INVALID_STUDENT_FOLDER = 'Invalid student folder';
exports.COULD_NOT_READ_COMMENT_LIST = 'Could not read list of comments!';
exports.NOT_PROVIDED_COMMENT = 'Comment must be provided!';
exports.HIGHLIGHT_HEIGHT = 20;
exports.STUDENT_DIRECTORY_ID_REGEX = /.*\((.+)\)/;
exports.STUDENT_DIRECTORY_REGEX = /(.*), (.*)\((.+)\)/;
exports.STUDENT_DIRECTORY_NO_NAME_REGEX = /(.*),\((.+)\)/;


/***/ }),

/***/ "./src-electron/utils.ts":
/*!*******************************!*\
  !*** ./src-electron/utils.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.stream2buffer = exports.getAllFiles = exports.joinError = exports.isBlank = exports.isEmpty = exports.isFolder = exports.deleteFolderRecursive = exports.isJson = exports.checkAccess = exports.writeToFile = exports.isNullOrUndefinedOrEmpty = exports.isNullOrUndefined = exports.isFunction = exports.toIpcResponse = void 0;
const fs_1 = __webpack_require__(/*! fs */ "fs");
const promises_1 = __webpack_require__(/*! fs/promises */ "fs/promises");
const path_1 = __webpack_require__(/*! path */ "path");
const rxjs_1 = __webpack_require__(/*! rxjs */ "rxjs");
/**
 * This is a middleware response used for IPC to work around a bug in electron where rejected promises
 * loose the original reason. This way, the main process always returns a resolved promise, but the result IpcResponse
 * will contain information if there was an error or not, and then reject the promise in the renderer side
 * https://github.com/electron/electron/issues/24427
 * @param listener
 */
function toIpcResponse(listener) {
    // Return a function that can be used as an IPC handler
    return (event, ...args) => {
        return listener(event, ...args).then((data) => {
            return {
                data
            };
        }, (error) => {
            return {
                error
            };
        });
    };
}
exports.toIpcResponse = toIpcResponse;
const isFunction = (functionToCheck) => {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
};
exports.isFunction = isFunction;
const isNullOrUndefined = (object) => {
    return (object === null || object === undefined);
};
exports.isNullOrUndefined = isNullOrUndefined;
const isNullOrUndefinedOrEmpty = (object) => {
    return (object === null || object === undefined || object === '');
};
exports.isNullOrUndefinedOrEmpty = isNullOrUndefinedOrEmpty;
function writeToFile(filePath, data, customSuccessMsg = null, customFailureMsg = null) {
    return (0, promises_1.writeFile)(filePath, data).then(() => {
        return (customSuccessMsg) ? customSuccessMsg : 'Successfully saved to file!';
    }, (err) => {
        return Promise.reject((customFailureMsg) ? customFailureMsg : err.message);
    });
}
exports.writeToFile = writeToFile;
/*HELPER FUNCTIONS*/
function checkAccess(filePath) {
    return (0, promises_1.access)(filePath, fs_1.constants.F_OK).then(rxjs_1.noop, (err) => {
        return Promise.reject(err.message);
    });
}
exports.checkAccess = checkAccess;
/*END HELPER FUNCTIONS*/
const isJson = (str) => {
    try {
        JSON.parse(str);
    }
    catch (e) {
        return false;
    }
    return true;
};
exports.isJson = isJson;
const deleteFolderRecursive = (path) => {
    if ((0, fs_1.existsSync)(path)) {
        (0, fs_1.readdirSync)(path).forEach(function (file, index) {
            const curPath = path + '/' + file;
            if (isFolder(curPath)) { // recurse
                (0, exports.deleteFolderRecursive)(curPath);
            }
            else { // delete file
                (0, fs_1.unlinkSync)(curPath);
            }
        });
        (0, fs_1.rmdirSync)(path);
    }
};
exports.deleteFolderRecursive = deleteFolderRecursive;
function isFolder(curPath) {
    return (0, fs_1.lstatSync)(curPath).isDirectory();
}
exports.isFolder = isFolder;
function isEmpty(str) {
    return str === null || str === undefined || str.length === 0;
}
exports.isEmpty = isEmpty;
function isBlank(data = '') {
    if (data === null || data === undefined) {
        return true;
    }
    data += '';
    return data === '' || data.trim() === '';
}
exports.isBlank = isBlank;
function joinError(currentMessage = '', newMessage = '') {
    currentMessage += (!isEmpty(currentMessage)) ? `, ${newMessage}` : newMessage;
    return currentMessage;
}
exports.joinError = joinError;
function getAllFiles(dirPath, arrayOfFiles) {
    return (0, promises_1.readdir)(dirPath).then((files) => {
        arrayOfFiles = arrayOfFiles || [];
        const promises = files.map((file) => {
            return (0, promises_1.stat)(dirPath + path_1.sep + file).then((statInfo) => {
                if (statInfo.isDirectory()) {
                    return getAllFiles(dirPath + path_1.sep + file, arrayOfFiles).then((dirFiles) => {
                        arrayOfFiles = dirFiles;
                    });
                }
                else {
                    arrayOfFiles.push(dirPath + path_1.sep + file);
                }
            });
        });
        return Promise.all(promises).then(() => arrayOfFiles);
    });
}
exports.getAllFiles = getAllFiles;
function stream2buffer(stream) {
    return new Promise((resolve, reject) => {
        const _buf = new Array();
        stream.on('data', chunk => _buf.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(_buf)));
        stream.on('error', err => reject(`error converting stream - ${err}`));
    });
}
exports.stream2buffer = stream2buffer;


/***/ }),

/***/ "./src/shared/constants/constants.ts":
/*!*******************************************!*\
  !*** ./src/shared/constants/constants.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PDFM_FILE_SORT = exports.PDFM_FILES_FILTER = exports.uuidv4 = exports.PDFM_FILES = exports.SUBMISSION_ZIP_ENTRY_REGEX = exports.FEEDBACK_ZIP_ENTRY_REGEX = exports.ASSIGNMENT_BACKUP_DIR = exports.ASSIGNMENT_ROOT_FILES = exports.GRADES_FILE = exports.MARK_FILE = exports.SETTING_FILE = exports.FEEDBACK_FOLDER = exports.SUBMISSION_FOLDER = exports.DEFAULT_WORKSPACE = exports.DEFAULT_COLOR = void 0;
const workspace_1 = __webpack_require__(/*! @shared/info-objects/workspace */ "./src/shared/info-objects/workspace.ts");
exports.DEFAULT_COLOR = '#6f327a';
exports.DEFAULT_WORKSPACE = 'Default Workspace';
exports.SUBMISSION_FOLDER = 'Submission attachment(s)';
exports.FEEDBACK_FOLDER = 'Feedback Attachment(s)';
exports.SETTING_FILE = '.settings.json';
exports.MARK_FILE = '.marks.json';
exports.GRADES_FILE = 'grades.csv';
exports.ASSIGNMENT_ROOT_FILES = [exports.GRADES_FILE, 'grades.xls', 'grades.xlsx'];
exports.ASSIGNMENT_BACKUP_DIR = '.backup';
exports.FEEDBACK_ZIP_ENTRY_REGEX = /\/(.*)\/Feedback Attachment\(s\)\/(.*)\.pdf/;
exports.SUBMISSION_ZIP_ENTRY_REGEX = /\/(.*)\/Submission attachment\(s\)\/(.*)\.pdf/;
exports.PDFM_FILES = [exports.MARK_FILE, exports.SETTING_FILE];
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
exports.uuidv4 = uuidv4;
function PDFM_FILES_FILTER(treeNode) {
    return !(treeNode.type === workspace_1.TreeNodeType.FILE && exports.PDFM_FILES.indexOf(treeNode.name) >= 0);
}
exports.PDFM_FILES_FILTER = PDFM_FILES_FILTER;
/**
 * < 0, a should be before
 * = 0, same level
 * > 0, a should be after
 * @param a
 * @param b
 * @constructor
 */
const PDFM_FILE_SORT = (a, b) => {
    let diff = a.type - b.type;
    if (diff === 0) {
        diff = a.name.localeCompare(b.name);
    }
    return diff;
};
exports.PDFM_FILE_SORT = PDFM_FILE_SORT;


/***/ }),

/***/ "./src/shared/info-objects/workspace.ts":
/*!**********************************************!*\
  !*** ./src/shared/info-objects/workspace.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.findTreeNodes = exports.findTreeNode = exports.TreeNodeType = void 0;
const lodash_1 = __webpack_require__(/*! lodash */ "lodash");
var TreeNodeType;
(function (TreeNodeType) {
    TreeNodeType[TreeNodeType["WORKSPACE"] = 0] = "WORKSPACE";
    TreeNodeType[TreeNodeType["ASSIGNMENT"] = 1] = "ASSIGNMENT";
    TreeNodeType[TreeNodeType["SUBMISSION"] = 2] = "SUBMISSION";
    TreeNodeType[TreeNodeType["FEEDBACK_DIRECTORY"] = 3] = "FEEDBACK_DIRECTORY";
    TreeNodeType[TreeNodeType["SUBMISSIONS_DIRECTORY"] = 4] = "SUBMISSIONS_DIRECTORY";
    TreeNodeType[TreeNodeType["FILE"] = 5] = "FILE";
})(TreeNodeType = exports.TreeNodeType || (exports.TreeNodeType = {}));
function findTreeNode(path, roots) {
    const paths = path.split('/');
    let rootNode = (0, lodash_1.find)(roots, { name: paths[0] });
    paths.slice(1).forEach(pi => {
        rootNode = rootNode.children.find(tn => tn.name === pi);
    });
    return rootNode;
}
exports.findTreeNode = findTreeNode;
function findTreeNodes(path, roots) {
    const nodes = [];
    const paths = path.split('/');
    let rootNode = (0, lodash_1.find)(roots, { name: paths[0] });
    nodes.push(rootNode);
    paths.slice(1).forEach(pi => {
        rootNode = rootNode.children.find(tn => tn.name === pi);
        nodes.push(rootNode);
    });
    return nodes;
}
exports.findTreeNodes = findTreeNodes;


/***/ }),

/***/ "fs-extra":
/*!***************************!*\
  !*** external "fs-extra" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("fs-extra");

/***/ }),

/***/ "lodash":
/*!*************************!*\
  !*** external "lodash" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("lodash");

/***/ }),

/***/ "rxjs":
/*!***********************!*\
  !*** external "rxjs" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("rxjs");

/***/ }),

/***/ "zip-dir":
/*!**************************!*\
  !*** external "zip-dir" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("zip-dir");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "fs/promises":
/*!******************************!*\
  !*** external "fs/promises" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("fs/promises");

/***/ }),

/***/ "node:worker_threads":
/*!**************************************!*\
  !*** external "node:worker_threads" ***!
  \**************************************/
/***/ ((module) => {

module.exports = require("node:worker_threads");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!****************************************!*\
  !*** ./src-electron/task_processer.ts ***!
  \****************************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const node_worker_threads_1 = __webpack_require__(/*! node:worker_threads */ "node:worker_threads");
const fs_1 = __webpack_require__(/*! fs */ "fs");
const path_1 = __webpack_require__(/*! path */ "path");
const promises_1 = __webpack_require__(/*! fs/promises */ "fs/promises");
const lodash_1 = __webpack_require__(/*! lodash */ "lodash");
const fs_extra_1 = __webpack_require__(/*! fs-extra */ "fs-extra");
const os_1 = __webpack_require__(/*! os */ "os");
const constants_1 = __webpack_require__(/*! ../src/shared/constants/constants */ "./src/shared/constants/constants.ts");
const constants_2 = __webpack_require__(/*! ./constants */ "./src-electron/constants.ts");
const utils_1 = __webpack_require__(/*! ./utils */ "./src-electron/utils.ts");
const zipDir = __webpack_require__(/*! zip-dir */ "zip-dir");
function getConfig() {
    return (0, promises_1.readFile)(constants_2.CONFIG_DIR + constants_2.CONFIG_FILE).then((data) => {
        if (!(0, utils_1.isJson)(data)) {
            return Promise.reject(`Corrupt configuration files at "${constants_2.CONFIG_DIR}${constants_2.CONFIG_FILE}"`);
        }
        return JSON.parse(data.toString());
    });
}
function getWorkingDirectoryAbsolutePath(workspaceName) {
    return getConfig().then((config) => {
        if (workspaceName === constants_1.DEFAULT_WORKSPACE || (0, lodash_1.isNil)(workspaceName)) {
            return config.defaultPath;
        }
        else {
            return config.defaultPath + path_1.sep + workspaceName;
        }
    });
}
function getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName) {
    return getWorkingDirectoryAbsolutePath(workspaceName).then((workingDirectory) => {
        return workingDirectory + path_1.sep + assignmentName;
    });
}
function getAssignmentSettingsFor(workspaceName, assignmentName) {
    return getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName)
        .then((directory) => getAssignmentSettingsAt(directory));
}
function getAssignmentSettingsAt(assignmentFolder) {
    assignmentFolder = assignmentFolder.replace(/\//g, path_1.sep);
    if ((0, fs_1.existsSync)(assignmentFolder)) {
        return (0, promises_1.readFile)(assignmentFolder + path_1.sep + constants_1.SETTING_FILE).then((data) => {
            if (!(0, utils_1.isJson)(data)) {
                return Promise.reject('Assignment settings is not JSON');
            }
            return JSON.parse(data.toString());
        }, (error) => {
            return Promise.reject(error.message);
        });
    }
    else {
        return Promise.reject('Could not load assignment settings');
    }
}
function writeAssignmentSettingsAt(assignmentSettings, assignmentAbsolutePath) {
    const buffer = new Uint8Array(Buffer.from(JSON.stringify(assignmentSettings)));
    return (0, utils_1.writeToFile)(assignmentAbsolutePath + path_1.sep + constants_1.SETTING_FILE, buffer, null, 'Failed to save assignment settings!').then(() => {
        return assignmentSettings;
    });
}
node_worker_threads_1.parentPort.on('message', (exportAssignmentsRequest) => {
    const tempDirectory = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), 'pdfm-'));
    const exportTempDirectory = tempDirectory + path_1.sep + exportAssignmentsRequest.assignmentName;
    return Promise.all([
        getAssignmentSettingsFor(exportAssignmentsRequest.workspaceFolder, exportAssignmentsRequest.assignmentName),
        getAssignmentDirectoryAbsolutePath(exportAssignmentsRequest.workspaceFolder, exportAssignmentsRequest.assignmentName),
        (0, promises_1.mkdir)(exportTempDirectory)
    ])
        .then(([assignmentSettings, originalAssignmentDirectory]) => {
        let exportSubmissions = assignmentSettings.submissions;
        if (!(0, lodash_1.isNil)(exportAssignmentsRequest.studentIds)) {
            // If a list of student ids was supplied we'll filter only those
            exportSubmissions = (0, lodash_1.filter)(assignmentSettings.submissions, (submission) => {
                return exportAssignmentsRequest.studentIds.indexOf(submission.studentId) >= 0;
            });
        }
        // Copy all the submission files
        const promises = exportSubmissions.map((submission) => {
            return (0, fs_extra_1.copy)(originalAssignmentDirectory + path_1.sep + submission.directoryName, exportTempDirectory + path_1.sep + submission.directoryName, {
                recursive: true,
                //   filter: (src) => {
                //     return !src.endsWith(MARK_FILE);
                //   }
            });
        });
        return Promise.all(promises)
            .then(() => {
            // We need to create a settings file
            const exportSettings = (0, lodash_1.cloneDeep)(assignmentSettings);
            if (!(0, lodash_1.isNil)(exportAssignmentsRequest.studentIds)) {
                // Filter out submissions if required
                exportSettings.submissions = exportSettings.submissions.filter((submission) => {
                    return exportAssignmentsRequest.studentIds.indexOf(submission.studentId) >= 0;
                });
            }
            return writeAssignmentSettingsAt(exportSettings, exportTempDirectory);
        })
            .then(() => {
            return zipDir(tempDirectory);
        })
            .then((buffer) => {
            // TODO cleanupTemp(tempDirectory);
            return buffer;
        }, (error) => {
            // TODO cleanupTemp(tempDirectory);
            return Promise.reject(error.message);
        });
    })
        .then((buffer) => {
        // TODO fix filename
        return (0, promises_1.writeFile)(exportAssignmentsRequest.exportPath + path_1.sep + exportAssignmentsRequest.markerEmail + '.zip', buffer);
    })
        .then(() => {
        node_worker_threads_1.parentPort.postMessage("done ");
    });
});

})();

/******/ })()
;
//# sourceMappingURL=taskProcessor.js.map