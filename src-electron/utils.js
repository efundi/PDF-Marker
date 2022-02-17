"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmpty = exports.validateRequest = exports.asyncForEach = exports.hierarchyModel = exports.uploadFile = exports.uploadFiles = exports.extractZipFile = exports.isFolder = exports.deleteFolderRecursive = exports.isJson = exports.checkAccess = exports.readFromFile = exports.writeToFile = exports.deleteMultipleFiles = exports.deleteUploadedFile = exports.isNullOrUndefinedOrEmpty = exports.isNullOrUndefined = exports.isFunction = exports.checkClient = exports.sendResponseData = exports.sendResponse = void 0;
const unzipper = __importStar(require("unzipper"));
const etl = __importStar(require("etl"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const constants_1 = require("./constants");
const path_1 = require("path");
const pdf_lib_1 = require("pdf-lib");
const rxjs_1 = require("rxjs");
const sendResponse = (req, res, statusCode, message) => {
    (0, exports.deleteUploadedFile)(req);
    (0, exports.deleteMultipleFiles)(req);
    return res.status(statusCode).send({ message });
};
exports.sendResponse = sendResponse;
const sendResponseData = (req, res, statusCode, data) => {
    (0, exports.deleteUploadedFile)(req);
    (0, exports.deleteMultipleFiles)(req);
    return res.status(statusCode).send(data);
};
exports.sendResponseData = sendResponseData;
const checkClient = (req, res) => {
    return (req.headers.client_id && req.headers.client_id === 'PDF_MARKER');
};
exports.checkClient = checkClient;
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
const deleteUploadedFile = (req) => {
    if (req.file && (0, fs_1.existsSync)(constants_1.UPLOADS_DIR + path_1.sep + req.file.originalname)) {
        (0, fs_1.unlinkSync)(constants_1.UPLOADS_DIR + path_1.sep + req.file.originalname);
    }
};
exports.deleteUploadedFile = deleteUploadedFile;
const deleteMultipleFiles = (req) => {
    if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
            if (req.files[i] && (0, fs_1.existsSync)(constants_1.UPLOADS_DIR + path_1.sep + req.files[i].originalname)) {
                (0, fs_1.unlinkSync)(constants_1.UPLOADS_DIR + path_1.sep + req.files[i].originalname);
            }
        }
    }
};
exports.deleteMultipleFiles = deleteMultipleFiles;
function writeToFile(filePath, data, customSuccessMsg = null, customFailureMsg = null) {
    return (0, promises_1.writeFile)(filePath, data).then(() => {
        return (customSuccessMsg) ? customSuccessMsg : 'Successfully saved to file!';
    }, (err) => {
        return Promise.reject((customFailureMsg) ? customFailureMsg : err.message);
    });
}
exports.writeToFile = writeToFile;
/*HELPER FUNCTIONS*/
const readFromFile = (req, res, filePath, callback = null, errorMessage = null) => {
    return (0, fs_1.readFile)(filePath, (err, data) => {
        if (err) {
            return (0, exports.sendResponse)(req, res, 500, (errorMessage) ? errorMessage : err.message);
        }
        if (callback && (0, exports.isFunction)(callback)) {
            callback(data);
        }
    });
};
exports.readFromFile = readFromFile;
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
const extractZipFile = (file, destination, newFolder, oldFolder, assignmentName, assignmentType) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO Should we validate the zip structure based on assignment type?
    if (assignmentType === 'Generic') {
        let skippedFirst = 1;
        return yield (0, fs_1.createReadStream)(file)
            .pipe(unzipper.Parse())
            .pipe(etl.map((entry) => __awaiter(void 0, void 0, void 0, function* () {
            const subheaders = `'Display ID','ID','Last Name','First Name','Mark','Submission date','Late submission'\n`;
            let csvString = '';
            const asnTitle = assignmentName;
            let dir = '';
            const isSet = true;
            if (entry.type === 'File') {
                const content = yield entry.buffer();
                // console.log("### - File Name First : " + entry.path);
                entry.path = entry.path.replace(oldFolder, newFolder);
                const directory = (0, path_1.dirname)(destination + entry.path.replace('/', path_1.sep));
                // const extension = extname(destination + entry.path.replace('/', sep)).substring(1);
                if (!(0, fs_1.existsSync)(directory)) {
                    (0, fs_1.mkdirSync)(directory, { recursive: true });
                }
                try {
                    const pdfDoc = yield pdf_lib_1.PDFDocument.load(content);
                    const fileName = entry.path;
                    console.log('### - File Name: ' + fileName);
                    // Submission Test (2)/Bob_Johnson_AA223556_This_is_my_assignment.pdf
                    const tempDetails = fileName.substring((fileName.indexOf('/') + 1));
                    const splitArray = tempDetails.split('_');
                    const studentName = splitArray[1];
                    const studentSurname = splitArray[0];
                    const studentID = splitArray[2];
                    // tempDetails = tempDetails.subentry.path.indexOf(SUBMISSION_FOLDER) !== -1 && extension === 'pdf'string((tempDetails.indexOf(studentID))+1,tempDetails.length);
                    const studentDirectory = studentSurname + ', ' + studentName + ' (' + studentID + ')';
                    const csvData = `${studentID.toUpperCase()},${studentID.toUpperCase()},${studentSurname.toUpperCase()},${studentName.toUpperCase()},,,\n`;
                    csvString = csvString + csvData;
                    dir = directory;
                    console.log('####');
                    console.log(directory);
                    (0, fs_1.mkdirSync)(directory + '/' + studentDirectory, { recursive: true });
                    (0, fs_1.mkdirSync)(directory + '/' + studentDirectory + '/' + constants_1.FEEDBACK_FOLDER, { recursive: true });
                    (0, fs_1.mkdirSync)(directory + '/' + studentDirectory + '/' + constants_1.SUBMISSION_FOLDER, { recursive: true });
                    if (!(0, fs_1.existsSync)(directory + constants_1.GRADES_FILE) && skippedFirst === 1) {
                        const headers = `'${asnTitle}','SCORE_GRADE_TYPE'\n`;
                        const csvFullString = headers + `''\n` + subheaders;
                        console.log(directory + constants_1.GRADES_FILE);
                        skippedFirst++;
                        yield (0, fs_1.writeFileSync)(directory + path_1.sep + constants_1.GRADES_FILE, csvFullString, { flag: 'a' });
                        yield (0, fs_1.writeFileSync)(directory + path_1.sep + constants_1.GRADES_FILE, csvString, { flag: 'a' });
                        console.log('create file');
                    }
                    else {
                        skippedFirst++;
                        yield (0, fs_1.writeFileSync)(directory + path_1.sep + constants_1.GRADES_FILE, csvString, { flag: 'a' });
                    }
                    // if (skippedFirst === 1) {
                    //   await writeFileSync(directory + GRADES_FILE, csvString, {flag: 'a'});
                    //   skippedFirst++;
                    // }
                    const pdfBytes = yield pdfDoc.save();
                    (0, fs_1.writeFileSync)(directory + '/' + studentDirectory + '/' + constants_1.SUBMISSION_FOLDER + '/' + tempDetails, pdfBytes);
                }
                catch (exception) {
                    console.log(exception);
                }
            }
            else {
                entry.path = entry.path.replace(oldFolder, newFolder);
                const directory = destination + entry.path.replace('/', path_1.sep);
                // const directory = pathinfo(destination + entry.path.replace('/', sep), 1);
                if (!(0, fs_1.existsSync)(directory)) {
                    (0, fs_1.mkdirSync)(directory, { recursive: true });
                }
                console.log('####');
                console.log(directory);
                if (!((0, fs_1.existsSync)(directory + constants_1.GRADES_FILE))) {
                    const headers = `{asnTitle}','SCORE_GRADE_TYPE'\n`;
                    const csvFullString = headers + `''\n` + subheaders;
                    //  csvFullString = csvFullString + csvString;
                    // console.log(csvFullString);
                    console.log(directory + constants_1.GRADES_FILE);
                    skippedFirst++;
                    yield (0, fs_1.writeFileSync)(directory + constants_1.GRADES_FILE, csvFullString, { flag: 'a' });
                    yield (0, fs_1.writeFileSync)(directory + constants_1.GRADES_FILE, csvString, { flag: 'a' });
                    console.log('create file');
                }
                else {
                    skippedFirst++;
                    yield (0, fs_1.writeFileSync)(directory + constants_1.GRADES_FILE, csvString, { flag: 'a' });
                }
            }
        }))).promise();
    }
    else {
        return yield (0, fs_1.createReadStream)(file)
            .pipe(unzipper.Parse())
            .pipe(etl.map((entry) => __awaiter(void 0, void 0, void 0, function* () {
            if (entry.type === 'File') {
                //
                const content = yield entry.buffer();
                entry.path = entry.path.replace(oldFolder, newFolder);
                const directory = (0, path_1.dirname)(destination + entry.path.replace('/', path_1.sep));
                const extension = (0, path_1.extname)(destination + entry.path.replace('/', path_1.sep)).substring(1);
                if (!(0, fs_1.existsSync)(directory)) {
                    (0, fs_1.mkdirSync)(directory, { recursive: true });
                }
                try {
                    if (entry.path.indexOf(constants_1.SUBMISSION_FOLDER) !== -1 && extension === 'pdf') {
                        // await writeFileSync(destination + entry.path.replace('/', sep),  content);
                        const pdfDoc = yield pdf_lib_1.PDFDocument.load(content);
                        const pdfBytes = yield pdfDoc.save();
                        yield (0, fs_1.writeFileSync)(destination + entry.path.replace('/', path_1.sep), pdfBytes);
                    }
                    else {
                        yield (0, fs_1.writeFileSync)(destination + entry.path.replace('/', path_1.sep), content);
                    }
                }
                catch (exception) {
                    console.log(exception);
                }
            }
            else {
                entry.path = entry.path.replace(oldFolder, newFolder);
                const directory = destination + entry.path.replace('/', path_1.sep);
                if (!(0, fs_1.existsSync)(directory)) {
                    (0, fs_1.mkdirSync)(directory, { recursive: true });
                }
                entry.autodrain();
            }
        }))).promise();
    }
});
exports.extractZipFile = extractZipFile;
const store = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        if (!(0, fs_1.existsSync)(constants_1.UPLOADS_DIR)) {
            (0, fs_1.mkdir)(constants_1.UPLOADS_DIR, err => cb(err, constants_1.UPLOADS_DIR));
        }
        else {
            cb(null, constants_1.UPLOADS_DIR);
        }
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
exports.uploadFiles = (0, multer_1.default)({ storage: store }).any();
exports.uploadFile = (0, multer_1.default)({ storage: store }).single('file');
const hierarchyModel = (pathInfos, configFolder) => {
    const pattern = /\\/g;
    configFolder = configFolder.replace(pattern, '/');
    const model = pathInfos.reduce((hier, pathInfo) => {
        const stat = (0, fs_1.statSync)(pathInfo);
        const path = pathInfo.replace(configFolder + '/', '');
        let pathObject = hier;
        const pathSplit = path.split('/');
        path.split('/').forEach((item) => {
            if (!pathObject[item]) {
                pathObject[item] = {};
            }
            pathObject = pathObject[item];
        });
        if (stat.isFile()) {
            pathObject.path = path;
            pathObject.basename = path.split('/').pop();
            if (pathSplit.indexOf(constants_1.SUBMISSION_FOLDER) > -1) {
                pathObject.isPdf = true;
            }
        }
        return hier;
    }, {});
    return model;
};
exports.hierarchyModel = hierarchyModel;
const asyncForEach = (array, callback) => __awaiter(void 0, void 0, void 0, function* () {
    for (let index = 0; index < array.length; index++) {
        yield callback(array[index], index, array);
    }
});
exports.asyncForEach = asyncForEach;
const validateRequest = (requiredKeys = [], receivedKeys = []) => {
    let invalidKeyFound = false;
    for (const key of receivedKeys) {
        if (requiredKeys.indexOf(key) === -1) {
            invalidKeyFound = true;
            break;
        }
    }
    return invalidKeyFound;
};
exports.validateRequest = validateRequest;
function isEmpty(str) {
    return str === null || str === undefined || str.length === 0;
}
exports.isEmpty = isEmpty;
//# sourceMappingURL=utils.js.map