/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src-electron/constants.ts":
/*!***********************************!*\
  !*** ./src-electron/constants.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "APP_DATA_DIR": () => (/* binding */ APP_DATA_DIR),
/* harmony export */   "COMMENTS_FILE": () => (/* binding */ COMMENTS_FILE),
/* harmony export */   "CONFIG_DIR": () => (/* binding */ CONFIG_DIR),
/* harmony export */   "CONFIG_FILE": () => (/* binding */ CONFIG_FILE),
/* harmony export */   "COULD_NOT_CREATE_CONFIG_DIRECTORY": () => (/* binding */ COULD_NOT_CREATE_CONFIG_DIRECTORY),
/* harmony export */   "COULD_NOT_CREATE_RUBRIC_FILE": () => (/* binding */ COULD_NOT_CREATE_RUBRIC_FILE),
/* harmony export */   "COULD_NOT_READ_COMMENT_LIST": () => (/* binding */ COULD_NOT_READ_COMMENT_LIST),
/* harmony export */   "COULD_NOT_READ_RUBRIC_LIST": () => (/* binding */ COULD_NOT_READ_RUBRIC_LIST),
/* harmony export */   "EXTRACTED_ZIP": () => (/* binding */ EXTRACTED_ZIP),
/* harmony export */   "EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC": () => (/* binding */ EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC),
/* harmony export */   "HIGHLIGHT_HEIGHT": () => (/* binding */ HIGHLIGHT_HEIGHT),
/* harmony export */   "INVALID_RUBRIC_JSON_FILE": () => (/* binding */ INVALID_RUBRIC_JSON_FILE),
/* harmony export */   "INVALID_STUDENT_FOLDER": () => (/* binding */ INVALID_STUDENT_FOLDER),
/* harmony export */   "NOT_CONFIGURED_CONFIG_DIRECTORY": () => (/* binding */ NOT_CONFIGURED_CONFIG_DIRECTORY),
/* harmony export */   "NOT_PROVIDED_COMMENT": () => (/* binding */ NOT_PROVIDED_COMMENT),
/* harmony export */   "NOT_PROVIDED_RUBRIC": () => (/* binding */ NOT_PROVIDED_RUBRIC),
/* harmony export */   "RUBRICS_FILE": () => (/* binding */ RUBRICS_FILE),
/* harmony export */   "STUDENT_DIRECTORY_ID_REGEX": () => (/* binding */ STUDENT_DIRECTORY_ID_REGEX),
/* harmony export */   "STUDENT_DIRECTORY_NO_NAME_REGEX": () => (/* binding */ STUDENT_DIRECTORY_NO_NAME_REGEX),
/* harmony export */   "STUDENT_DIRECTORY_REGEX": () => (/* binding */ STUDENT_DIRECTORY_REGEX)
/* harmony export */ });
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_0__);

const CONFIG_FILE = 'config.json';
const RUBRICS_FILE = 'rubrics.json';
const APP_DATA_DIR = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME +
    '/Library/Preferences' : process.env.HOME + '/.local/share');
const CONFIG_DIR = APP_DATA_DIR + path__WEBPACK_IMPORTED_MODULE_0__.sep + 'pdf-config' + path__WEBPACK_IMPORTED_MODULE_0__.sep;
const COMMENTS_FILE = 'comments.json';
/*COMMON MESSAGES*/
const INVALID_RUBRIC_JSON_FILE = 'Rubric file is not a valid JSON file!';
const COULD_NOT_CREATE_RUBRIC_FILE = 'Failed to read rubric file!';
const COULD_NOT_READ_RUBRIC_LIST = 'Could not read list of rubrics!';
const NOT_PROVIDED_RUBRIC = 'Rubric must be provided!';
const COULD_NOT_CREATE_CONFIG_DIRECTORY = 'Failed to create configuration directory!';
const NOT_CONFIGURED_CONFIG_DIRECTORY = 'Configure default location to extract files to on the settings page!';
const EXTRACTED_ZIP = 'Successfully extracted assignment to selected workspace!';
const EXTRACTED_ZIP_BUT_FAILED_TO_WRITE_TO_RUBRIC = 'Successfully extracted assignment to selected workspace! ' +
    'But Failed to write to rubrics file!';
const INVALID_STUDENT_FOLDER = 'Invalid student folder';
const COULD_NOT_READ_COMMENT_LIST = 'Could not read list of comments!';
const NOT_PROVIDED_COMMENT = 'Comment must be provided!';
const HIGHLIGHT_HEIGHT = 20;
const STUDENT_DIRECTORY_ID_REGEX = /.*\((.+)\)/;
const STUDENT_DIRECTORY_REGEX = /(.*), (.*)\((.+)\)/;
const STUDENT_DIRECTORY_NO_NAME_REGEX = /(.*),\((.+)\)/;


/***/ }),

/***/ "./src-electron/utils.ts":
/*!*******************************!*\
  !*** ./src-electron/utils.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "checkAccess": () => (/* binding */ checkAccess),
/* harmony export */   "deleteFolderRecursive": () => (/* binding */ deleteFolderRecursive),
/* harmony export */   "getAllFiles": () => (/* binding */ getAllFiles),
/* harmony export */   "isBlank": () => (/* binding */ isBlank),
/* harmony export */   "isEmpty": () => (/* binding */ isEmpty),
/* harmony export */   "isFolder": () => (/* binding */ isFolder),
/* harmony export */   "isFunction": () => (/* binding */ isFunction),
/* harmony export */   "isJson": () => (/* binding */ isJson),
/* harmony export */   "isNullOrUndefined": () => (/* binding */ isNullOrUndefined),
/* harmony export */   "isNullOrUndefinedOrEmpty": () => (/* binding */ isNullOrUndefinedOrEmpty),
/* harmony export */   "joinError": () => (/* binding */ joinError),
/* harmony export */   "stream2buffer": () => (/* binding */ stream2buffer),
/* harmony export */   "toIpcResponse": () => (/* binding */ toIpcResponse),
/* harmony export */   "writeToFile": () => (/* binding */ writeToFile)
/* harmony export */ });
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs/promises */ "fs/promises");
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(fs_promises__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! rxjs */ "rxjs");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(rxjs__WEBPACK_IMPORTED_MODULE_3__);




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
const isFunction = (functionToCheck) => {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
};
const isNullOrUndefined = (object) => {
    return (object === null || object === undefined);
};
const isNullOrUndefinedOrEmpty = (object) => {
    return (object === null || object === undefined || object === '');
};
function writeToFile(filePath, data, customSuccessMsg = null, customFailureMsg = null) {
    return (0,fs_promises__WEBPACK_IMPORTED_MODULE_1__.writeFile)(filePath, data).then(() => {
        return (customSuccessMsg) ? customSuccessMsg : 'Successfully saved to file!';
    }, (err) => {
        return Promise.reject((customFailureMsg) ? customFailureMsg : err.message);
    });
}
/*HELPER FUNCTIONS*/
function checkAccess(filePath) {
    return (0,fs_promises__WEBPACK_IMPORTED_MODULE_1__.access)(filePath, fs__WEBPACK_IMPORTED_MODULE_0__.constants.F_OK).then(rxjs__WEBPACK_IMPORTED_MODULE_3__.noop, (err) => {
        return Promise.reject(err.message);
    });
}
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
const deleteFolderRecursive = (path) => {
    if ((0,fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(path)) {
        (0,fs__WEBPACK_IMPORTED_MODULE_0__.readdirSync)(path).forEach(function (file, index) {
            const curPath = path + '/' + file;
            if (isFolder(curPath)) { // recurse
                deleteFolderRecursive(curPath);
            }
            else { // delete file
                (0,fs__WEBPACK_IMPORTED_MODULE_0__.unlinkSync)(curPath);
            }
        });
        (0,fs__WEBPACK_IMPORTED_MODULE_0__.rmdirSync)(path);
    }
};
function isFolder(curPath) {
    return (0,fs__WEBPACK_IMPORTED_MODULE_0__.lstatSync)(curPath).isDirectory();
}
function isEmpty(str) {
    return str === null || str === undefined || str.length === 0;
}
function isBlank(data = '') {
    if (data === null || data === undefined) {
        return true;
    }
    data += '';
    return data === '' || data.trim() === '';
}
function joinError(currentMessage = '', newMessage = '') {
    currentMessage += (!isEmpty(currentMessage)) ? `, ${newMessage}` : newMessage;
    return currentMessage;
}
function getAllFiles(dirPath, arrayOfFiles) {
    return (0,fs_promises__WEBPACK_IMPORTED_MODULE_1__.readdir)(dirPath).then((files) => {
        arrayOfFiles = arrayOfFiles || [];
        const promises = files.map((file) => {
            return (0,fs_promises__WEBPACK_IMPORTED_MODULE_1__.stat)(dirPath + path__WEBPACK_IMPORTED_MODULE_2__.sep + file).then((statInfo) => {
                if (statInfo.isDirectory()) {
                    return getAllFiles(dirPath + path__WEBPACK_IMPORTED_MODULE_2__.sep + file, arrayOfFiles).then((dirFiles) => {
                        arrayOfFiles = dirFiles;
                    });
                }
                else {
                    arrayOfFiles.push(dirPath + path__WEBPACK_IMPORTED_MODULE_2__.sep + file);
                }
            });
        });
        return Promise.all(promises).then(() => arrayOfFiles);
    });
}
function stream2buffer(stream) {
    return new Promise((resolve, reject) => {
        const _buf = new Array();
        stream.on('data', chunk => _buf.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(_buf)));
        stream.on('error', err => reject(`error converting stream - ${err}`));
    });
}


/***/ }),

/***/ "./src/shared/constants/constants.ts":
/*!*******************************************!*\
  !*** ./src/shared/constants/constants.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ASSIGNMENT_BACKUP_DIR": () => (/* binding */ ASSIGNMENT_BACKUP_DIR),
/* harmony export */   "ASSIGNMENT_ROOT_FILES": () => (/* binding */ ASSIGNMENT_ROOT_FILES),
/* harmony export */   "DEFAULT_COLOR": () => (/* binding */ DEFAULT_COLOR),
/* harmony export */   "DEFAULT_WORKSPACE": () => (/* binding */ DEFAULT_WORKSPACE),
/* harmony export */   "FEEDBACK_FOLDER": () => (/* binding */ FEEDBACK_FOLDER),
/* harmony export */   "FEEDBACK_ZIP_ENTRY_REGEX": () => (/* binding */ FEEDBACK_ZIP_ENTRY_REGEX),
/* harmony export */   "GRADES_FILE": () => (/* binding */ GRADES_FILE),
/* harmony export */   "MARK_FILE": () => (/* binding */ MARK_FILE),
/* harmony export */   "PDFM_FILES": () => (/* binding */ PDFM_FILES),
/* harmony export */   "PDFM_FILES_FILTER": () => (/* binding */ PDFM_FILES_FILTER),
/* harmony export */   "PDFM_FILE_SORT": () => (/* binding */ PDFM_FILE_SORT),
/* harmony export */   "SETTING_FILE": () => (/* binding */ SETTING_FILE),
/* harmony export */   "SUBMISSION_FOLDER": () => (/* binding */ SUBMISSION_FOLDER),
/* harmony export */   "SUBMISSION_ZIP_ENTRY_REGEX": () => (/* binding */ SUBMISSION_ZIP_ENTRY_REGEX),
/* harmony export */   "uuidv4": () => (/* binding */ uuidv4)
/* harmony export */ });
/* harmony import */ var _shared_info_objects_workspace__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @shared/info-objects/workspace */ "./src/shared/info-objects/workspace.ts");

const DEFAULT_COLOR = '#6f327a';
const DEFAULT_WORKSPACE = 'Default Workspace';
const SUBMISSION_FOLDER = 'Submission attachment(s)';
const FEEDBACK_FOLDER = 'Feedback Attachment(s)';
const SETTING_FILE = '.settings.json';
const MARK_FILE = '.marks.json';
const GRADES_FILE = 'grades.csv';
const ASSIGNMENT_ROOT_FILES = [GRADES_FILE, 'grades.xls', 'grades.xlsx'];
const ASSIGNMENT_BACKUP_DIR = '.backup';
const FEEDBACK_ZIP_ENTRY_REGEX = /\/(.*)\/Feedback Attachment\(s\)\/(.*)\.pdf/;
const SUBMISSION_ZIP_ENTRY_REGEX = /\/(.*)\/Submission attachment\(s\)\/(.*)\.pdf/;
const PDFM_FILES = [MARK_FILE, SETTING_FILE];
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function PDFM_FILES_FILTER(treeNode) {
    return !(treeNode.type === _shared_info_objects_workspace__WEBPACK_IMPORTED_MODULE_0__.TreeNodeType.FILE && PDFM_FILES.indexOf(treeNode.name) >= 0);
}
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


/***/ }),

/***/ "./src/shared/info-objects/assignment-settings.info.ts":
/*!*************************************************************!*\
  !*** ./src/shared/info-objects/assignment-settings.info.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AssignmentSettingsVersion": () => (/* binding */ AssignmentSettingsVersion),
/* harmony export */   "AssignmentState": () => (/* binding */ AssignmentState),
/* harmony export */   "DEFAULT_ASSIGNMENT_SETTINGS": () => (/* binding */ DEFAULT_ASSIGNMENT_SETTINGS),
/* harmony export */   "DistributionFormat": () => (/* binding */ DistributionFormat),
/* harmony export */   "SourceFormat": () => (/* binding */ SourceFormat),
/* harmony export */   "SubmissionState": () => (/* binding */ SubmissionState)
/* harmony export */ });
/* harmony import */ var _shared_constants_constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @shared/constants/constants */ "./src/shared/constants/constants.ts");

const AssignmentSettingsVersion = 1;
var SourceFormat;
(function (SourceFormat) {
    SourceFormat["MANUAL"] = "MANUAL";
    SourceFormat["SAKAI"] = "SAKAI";
    SourceFormat["GENERIC"] = "GENERIC";
})(SourceFormat || (SourceFormat = {}));
/**
 * An enum defining the format in which an assignment is in.
 * Assignments can be imported, shared, and exported for marking.
 * This enum defines these formats as they are written to file.
 */
var DistributionFormat;
(function (DistributionFormat) {
    /**
     * An assignment in the source format.
     */
    DistributionFormat["DISTRIBUTED"] = "DISTRIBUTED";
    /**
     * An assignment that is only used by a single user.
     * This is also the default if nothing is set
     */
    DistributionFormat["STANDALONE"] = "STANDALONE";
})(DistributionFormat || (DistributionFormat = {}));
var AssignmentState;
(function (AssignmentState) {
    AssignmentState["NOT_STARTED"] = "NOT_STARTED";
    AssignmentState["IN_PROGRESS"] = "IN_PROGRESS";
    AssignmentState["FINALIZED"] = "FINALIZED";
    AssignmentState["SENT_FOR_REVIEW"] = "SENT_FOR_REVIEW";
})(AssignmentState || (AssignmentState = {}));
var SubmissionState;
(function (SubmissionState) {
    /**
     * New untouched submission
     * text: "--"
     */
    SubmissionState["NEW"] = "NEW";
    /**
     * Allocated to a marker
     * text: "Assigned"
     */
    SubmissionState["ASSIGNED_TO_MARKER"] = "ASSIGNED_TO_MARKER";
    /**
     * A marked submission
     * text: "Marked"
     */
    SubmissionState["MARKED"] = "MARKED";
    /**
     * An assignment that has not been marked, but has been finalized or exported for review
     * text: 'Not Marked'
     */
    SubmissionState["NOT_MARKED"] = "NOT_MARKED";
    SubmissionState["SENT_FOR_MODERATION"] = "SENT_FOR_MODERATION";
    SubmissionState["MODERATED"] = "MODERATED";
})(SubmissionState || (SubmissionState = {}));
const DEFAULT_ASSIGNMENT_SETTINGS = {
    assignmentName: null,
    sourceId: null,
    version: AssignmentSettingsVersion,
    distributionFormat: DistributionFormat.STANDALONE,
    owner: null,
    state: AssignmentState.NOT_STARTED,
    stateDate: null,
    defaultColour: _shared_constants_constants__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_COLOR,
    rubric: null,
    sourceFormat: SourceFormat.MANUAL,
    submissions: []
};


/***/ }),

/***/ "./src/shared/info-objects/workspace.ts":
/*!**********************************************!*\
  !*** ./src/shared/info-objects/workspace.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "TreeNodeType": () => (/* binding */ TreeNodeType),
/* harmony export */   "findTreeNode": () => (/* binding */ findTreeNode),
/* harmony export */   "findTreeNodes": () => (/* binding */ findTreeNodes)
/* harmony export */ });
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lodash */ "lodash");
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_0__);

var TreeNodeType;
(function (TreeNodeType) {
    TreeNodeType[TreeNodeType["WORKSPACE"] = 0] = "WORKSPACE";
    TreeNodeType[TreeNodeType["ASSIGNMENT"] = 1] = "ASSIGNMENT";
    TreeNodeType[TreeNodeType["SUBMISSION"] = 2] = "SUBMISSION";
    TreeNodeType[TreeNodeType["FEEDBACK_DIRECTORY"] = 3] = "FEEDBACK_DIRECTORY";
    TreeNodeType[TreeNodeType["SUBMISSIONS_DIRECTORY"] = 4] = "SUBMISSIONS_DIRECTORY";
    TreeNodeType[TreeNodeType["FILE"] = 5] = "FILE";
})(TreeNodeType || (TreeNodeType = {}));
function findTreeNode(path, roots) {
    const paths = path.split('/');
    let rootNode = (0,lodash__WEBPACK_IMPORTED_MODULE_0__.find)(roots, { name: paths[0] });
    paths.slice(1).forEach(pi => {
        rootNode = rootNode.children.find(tn => tn.name === pi);
    });
    return rootNode;
}
function findTreeNodes(path, roots) {
    const nodes = [];
    const paths = path.split('/');
    let rootNode = (0,lodash__WEBPACK_IMPORTED_MODULE_0__.find)(roots, { name: paths[0] });
    nodes.push(rootNode);
    paths.slice(1).forEach(pi => {
        rootNode = rootNode.children.find(tn => tn.name === pi);
        nodes.push(rootNode);
    });
    return nodes;
}


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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!********************************************!*\
  !*** ./src-electron/export-marker-task.ts ***!
  \********************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var node_worker_threads__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:worker_threads */ "node:worker_threads");
/* harmony import */ var node_worker_threads__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_worker_threads__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! fs/promises */ "fs/promises");
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(fs_promises__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _src_shared_info_objects_assignment_settings_info__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../src/shared/info-objects/assignment-settings.info */ "./src/shared/info-objects/assignment-settings.info.ts");
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! lodash */ "lodash");
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var fs_extra__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! fs-extra */ "fs-extra");
/* harmony import */ var fs_extra__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(fs_extra__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! os */ "os");
/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(os__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var _src_shared_constants_constants__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../src/shared/constants/constants */ "./src/shared/constants/constants.ts");
/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./constants */ "./src-electron/constants.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./utils */ "./src-electron/utils.ts");
/**
 * ##################################################
 *
 *  BE REALLY CAREFUL WHAT YOU IMPORT HERE
 *  THIS FILE IS BUILD AS A WEB WORKER
 *
 * ##################################################
 */











const zipDir = __webpack_require__(/*! zip-dir */ "zip-dir");
/**
 * ##################################################
 *
 *  BE REALLY CAREFUL WHAT YOU IMPORT HERE
 *  THIS FILE IS BUILD AS A WEB WORKER
 *
 * ##################################################
 */
function getConfig() {
    return (0,fs_promises__WEBPACK_IMPORTED_MODULE_3__.readFile)(_constants__WEBPACK_IMPORTED_MODULE_9__.CONFIG_DIR + _constants__WEBPACK_IMPORTED_MODULE_9__.CONFIG_FILE).then((data) => {
        if (!(0,_utils__WEBPACK_IMPORTED_MODULE_10__.isJson)(data)) {
            return Promise.reject(`Corrupt configuration files at "${_constants__WEBPACK_IMPORTED_MODULE_9__.CONFIG_DIR}${_constants__WEBPACK_IMPORTED_MODULE_9__.CONFIG_FILE}"`);
        }
        return JSON.parse(data.toString());
    });
}
function getWorkingDirectoryAbsolutePath(workspaceName) {
    return getConfig().then((config) => {
        if (workspaceName === _src_shared_constants_constants__WEBPACK_IMPORTED_MODULE_8__.DEFAULT_WORKSPACE || (0,lodash__WEBPACK_IMPORTED_MODULE_5__.isNil)(workspaceName)) {
            return config.defaultPath;
        }
        else {
            return config.defaultPath + path__WEBPACK_IMPORTED_MODULE_2__.sep + workspaceName;
        }
    });
}
function getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName) {
    return getWorkingDirectoryAbsolutePath(workspaceName).then((workingDirectory) => {
        return workingDirectory + path__WEBPACK_IMPORTED_MODULE_2__.sep + assignmentName;
    });
}
function getAssignmentSettingsFor(workspaceName, assignmentName) {
    return getAssignmentDirectoryAbsolutePath(workspaceName, assignmentName)
        .then((directory) => getAssignmentSettingsAt(directory));
}
function getAssignmentSettingsAt(assignmentFolder) {
    assignmentFolder = assignmentFolder.replace(/\//g, path__WEBPACK_IMPORTED_MODULE_2__.sep);
    if ((0,fs__WEBPACK_IMPORTED_MODULE_1__.existsSync)(assignmentFolder)) {
        return (0,fs_promises__WEBPACK_IMPORTED_MODULE_3__.readFile)(assignmentFolder + path__WEBPACK_IMPORTED_MODULE_2__.sep + _src_shared_constants_constants__WEBPACK_IMPORTED_MODULE_8__.SETTING_FILE).then((data) => {
            if (!(0,_utils__WEBPACK_IMPORTED_MODULE_10__.isJson)(data)) {
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
    return (0,_utils__WEBPACK_IMPORTED_MODULE_10__.writeToFile)(assignmentAbsolutePath + path__WEBPACK_IMPORTED_MODULE_2__.sep + _src_shared_constants_constants__WEBPACK_IMPORTED_MODULE_8__.SETTING_FILE, buffer, null, 'Failed to save assignment settings!').then(() => {
        return assignmentSettings;
    });
}
function cleanupTemp(tmpDir) {
    try {
        if (tmpDir) {
            (0,fs__WEBPACK_IMPORTED_MODULE_1__.rmSync)(tmpDir, { recursive: true });
        }
    }
    catch (e) {
        console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
    }
}
node_worker_threads__WEBPACK_IMPORTED_MODULE_0__.parentPort.on('message', (exportAssignmentsRequest) => {
    const tempDirectory = (0,fs__WEBPACK_IMPORTED_MODULE_1__.mkdtempSync)((0,path__WEBPACK_IMPORTED_MODULE_2__.join)((0,os__WEBPACK_IMPORTED_MODULE_7__.tmpdir)(), 'pdfm-'));
    const exportTempDirectory = tempDirectory + path__WEBPACK_IMPORTED_MODULE_2__.sep + exportAssignmentsRequest.assignmentName;
    return Promise.all([
        getAssignmentSettingsFor(exportAssignmentsRequest.workspaceFolder, exportAssignmentsRequest.assignmentName),
        getAssignmentDirectoryAbsolutePath(exportAssignmentsRequest.workspaceFolder, exportAssignmentsRequest.assignmentName),
        (0,fs_promises__WEBPACK_IMPORTED_MODULE_3__.mkdir)(exportTempDirectory)
    ])
        .then(([assignmentSettings, originalAssignmentDirectory]) => {
        let exportSubmissions = assignmentSettings.submissions;
        if (!(0,lodash__WEBPACK_IMPORTED_MODULE_5__.isNil)(exportAssignmentsRequest.studentIds)) {
            // If a list of student ids was supplied we'll filter only those
            exportSubmissions = (0,lodash__WEBPACK_IMPORTED_MODULE_5__.filter)(assignmentSettings.submissions, (submission) => {
                return exportAssignmentsRequest.studentIds.indexOf(submission.studentId) >= 0;
            });
        }
        // Copy all the submission files
        const promises = exportSubmissions.map((submission) => {
            return (0,fs_extra__WEBPACK_IMPORTED_MODULE_6__.copy)(originalAssignmentDirectory + path__WEBPACK_IMPORTED_MODULE_2__.sep + submission.directoryName, exportTempDirectory + path__WEBPACK_IMPORTED_MODULE_2__.sep + submission.directoryName, {
                recursive: true
            });
        });
        return Promise.all(promises)
            .then(() => {
            // We need to create a settings file
            const exportSettings = (0,lodash__WEBPACK_IMPORTED_MODULE_5__.cloneDeep)(assignmentSettings);
            exportSettings.state = _src_shared_info_objects_assignment_settings_info__WEBPACK_IMPORTED_MODULE_4__.AssignmentState.NOT_STARTED;
            if (!(0,lodash__WEBPACK_IMPORTED_MODULE_5__.isNil)(exportAssignmentsRequest.studentIds)) {
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
            cleanupTemp(tempDirectory);
            return buffer;
        }, (error) => {
            cleanupTemp(tempDirectory);
            return Promise.reject(error.message);
        });
    })
        .then((buffer) => {
        return (0,fs_promises__WEBPACK_IMPORTED_MODULE_3__.writeFile)(exportAssignmentsRequest.exportPath + path__WEBPACK_IMPORTED_MODULE_2__.sep + exportAssignmentsRequest.assignmentName + '-' + exportAssignmentsRequest.markerEmail + '.zip', buffer);
    })
        .then(() => {
        node_worker_threads__WEBPACK_IMPORTED_MODULE_0__.parentPort.postMessage('Created zip: ' + exportAssignmentsRequest.exportPath + path__WEBPACK_IMPORTED_MODULE_2__.sep + exportAssignmentsRequest.markerEmail + '.zip');
    });
});

})();

/******/ })()
;
//# sourceMappingURL=exportMarkerTask.js.map