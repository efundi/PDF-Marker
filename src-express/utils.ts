import * as unzipper from 'unzipper';
import * as etl from 'etl';
import {Request, Response} from 'express';
import {
  access,
  constants,
  createReadStream,
  existsSync,
  lstatSync,
  mkdir,
  mkdirSync,
  readdirSync,
  readFile,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFile, writeFileSync
} from 'fs';
import {FEEDBACK_FOLDER, GRADES_FILE, SUBMISSION_FOLDER, UPLOADS_DIR} from './constants';
import {sep, extname, dirname} from 'path';
import {PDFDocument} from 'pdf-lib';

export const sendResponse = (req: Request, res: Response, statusCode: number, message: string) => {
  deleteUploadedFile(req);
  deleteMultipleFiles(req);
  return res.status(statusCode).send({message});
};

export const sendResponseData = (req: Request, res: Response, statusCode: number, data: any) => {
  deleteUploadedFile(req);
  deleteMultipleFiles(req);
  return res.status(statusCode).send(data);
};



export const checkClient = (req: Request, res: Response) => {
  return (req.headers.client_id && req.headers.client_id === 'PDF_MARKER');
};

export const isFunction = (functionToCheck) => {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
};

export const isNullOrUndefined = (object: any): boolean => {
  return (object === null || object === undefined);
};

export const isNullOrUndefinedOrEmpty = (object: string): boolean => {
  return (object === null || object === undefined || object === '');
};


export const deleteUploadedFile = (req) => {
  if (req.file && existsSync(UPLOADS_DIR + sep + req.file.originalname)) {
    unlinkSync(UPLOADS_DIR + sep + req.file.originalname);
  }
};

export const deleteMultipleFiles = (req) => {
  if (req.files && req.files.length > 0) {
    for (let i = 0; i < req.files.length; i++) {
      if (req.files[i] && existsSync(UPLOADS_DIR + sep + req.files[i].originalname)) {
        unlinkSync(UPLOADS_DIR + sep + req.files[i].originalname);
      }
    }
  }
};


export const writeToFile = (req, res, filePath: string,
                     data: Uint8Array | string,
                     customSuccessMsg: string = null,
                     customFailureMsg: string = null,
                     callback = null) => {
  writeFile(filePath, data, (err) => {
    if (err) {
      return sendResponse(req, res, 500, (customFailureMsg) ? customFailureMsg : err.message);
    }

    if (callback && isFunction(callback)) {
      callback();
    } else {
      return sendResponse(req, res, 200, (customSuccessMsg) ? customSuccessMsg : 'Successfully saved to file!');
    }
  });
};


/*HELPER FUNCTIONS*/
export const readFromFile = (req, res, filePath: string, callback = null, errorMessage: string = null) => {
  return readFile(filePath, (err, data) => {
    if (err) {
      return sendResponse(req, res, 500, (errorMessage) ? errorMessage : err.message);
    }

    if (callback && isFunction(callback)) {
      callback(data);
    }
  });
};


export const checkAccess = (req, res, filePath: string, callback = null) => {
  return access(filePath, constants.F_OK, (err) => {
    if (err) {
      return sendResponse(req, res, 404, err.message);
    }

    if (callback && isFunction(callback)) {
      callback();
    }
  });
};

/*END HELPER FUNCTIONS*/



export const isJson = (str) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};



export const deleteFolderRecursive = (path) => {
  if (existsSync(path)) {
    readdirSync(path).forEach(function(file, index) {
      const curPath = path + '/' + file;
      if (isFolder(curPath)) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        unlinkSync(curPath);
      }
    });
    rmdirSync(path);
  }
};

export function isFolder(curPath: string) {
  return lstatSync(curPath).isDirectory();
}



export const extractZipFile = async (file, destination, newFolder, oldFolder, assignmentName, assignmentType) => {
  // TODO Should we validate the zip structure based on assignment type?
  if (assignmentType === 'Generic') {
    let skippedFirst = 1;
    return await createReadStream(file)
      .pipe(unzipper.Parse())
      .pipe(etl.map(async entry => {
        const subheaders = `'Display ID','ID','Last Name','First Name','Mark','Submission date','Late submission'\n`;
        let csvString = '';
        const asnTitle = assignmentName;
        let dir = '';
        const isSet = true;
        if (entry.type === 'File') {
          const content = await entry.buffer();
          // console.log("### - File Name First : " + entry.path);
          entry.path = entry.path.replace(oldFolder, newFolder);

          const directory = dirname(destination + entry.path.replace('/', sep));
          // const extension = extname(destination + entry.path.replace('/', sep)).substring(1);


          if (!existsSync(directory)) {
            mkdirSync(directory, {recursive: true});
          }
          try {
            const pdfDoc = await PDFDocument.load(content);
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
            mkdirSync(directory + '/' + studentDirectory, {recursive: true});
            mkdirSync(directory + '/' + studentDirectory + '/' + FEEDBACK_FOLDER, {recursive: true});
            mkdirSync(directory + '/' + studentDirectory + '/' + SUBMISSION_FOLDER, {recursive: true});
            if (!existsSync(directory + GRADES_FILE) && skippedFirst === 1) {
              const headers = `'${asnTitle}','SCORE_GRADE_TYPE'\n`;
              const csvFullString = headers + `''\n` + subheaders;
              console.log(directory + GRADES_FILE);
              skippedFirst++;
              await writeFileSync(directory + sep + GRADES_FILE, csvFullString, {flag: 'a'});
              await writeFileSync(directory + sep + GRADES_FILE, csvString, {flag: 'a'});
              console.log('create file');
            } else {
              skippedFirst++;
              await writeFileSync(directory + sep + GRADES_FILE, csvString, {flag: 'a'});
            }
            // if (skippedFirst === 1) {
            //   await writeFileSync(directory + GRADES_FILE, csvString, {flag: 'a'});
            //   skippedFirst++;
            // }
            const pdfBytes = await pdfDoc.save();
            writeFileSync(directory + '/' + studentDirectory + '/' + SUBMISSION_FOLDER + '/' + tempDetails, pdfBytes);
          } catch (exception) {
            console.log(exception);
          }
        } else {
          entry.path = entry.path.replace(oldFolder, newFolder);
          const directory = destination + entry.path.replace('/', sep);
          // const directory = pathinfo(destination + entry.path.replace('/', sep), 1);
          if (!existsSync(directory)) {
            mkdirSync(directory, {recursive: true});
          }
          console.log('####');
          console.log(directory);
          if (!(existsSync(directory + GRADES_FILE))) {
            const headers = `{asnTitle}','SCORE_GRADE_TYPE'\n`;
            const csvFullString = headers + `''\n` + subheaders;
            //  csvFullString = csvFullString + csvString;
            // console.log(csvFullString);
            console.log(directory + GRADES_FILE);
            skippedFirst++;
            await writeFileSync(directory + GRADES_FILE, csvFullString, {flag: 'a'});
            await writeFileSync(directory + GRADES_FILE, csvString, {flag: 'a'});
            console.log('create file');
          } else {
            skippedFirst++;
            await writeFileSync(directory + GRADES_FILE, csvString, {flag: 'a'});
          }
        }
      })).promise();

  } else {
    return await createReadStream(file)
      .pipe(unzipper.Parse())
      .pipe(etl.map(async entry => {
        if (entry.type === 'File') {
          //
          const content = await entry.buffer();
          entry.path = entry.path.replace(oldFolder, newFolder);
          const directory = dirname(destination + entry.path.replace('/', sep));
          const extension = extname(destination + entry.path.replace('/', sep)).substring(1);

          if (!existsSync(directory)) {
            mkdirSync(directory, {recursive: true});
          }
          try {
            if (entry.path.indexOf(SUBMISSION_FOLDER) !== -1 && extension === 'pdf') {
              // await writeFileSync(destination + entry.path.replace('/', sep),  content);
              const pdfDoc = await PDFDocument.load(content);
              const pdfBytes = await pdfDoc.save();
              await writeFileSync(destination + entry.path.replace('/', sep), pdfBytes);
            } else {
              await writeFileSync(destination + entry.path.replace('/', sep), content);
            }
          } catch (exception) {
            console.log(exception);
          }
        } else {
          entry.path = entry.path.replace(oldFolder, newFolder);
          const directory = destination + entry.path.replace('/', sep);
          if (!existsSync(directory)) {
            mkdirSync(directory, {recursive: true});
          }
          entry.autodrain();
        }
      })).promise();
  }
};



export const hierarchyModel = (pathInfos, configFolder) => {
  const pattern = /\\/g;
  configFolder = configFolder.replace(pattern, '/');
  const model = pathInfos.reduce((hier, pathInfo) => {
    const stat = statSync(pathInfo);
    const path = pathInfo.replace(configFolder + '/', '');
    let pathObject: any = hier;
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
      if (pathSplit.indexOf(SUBMISSION_FOLDER) > -1) {
        pathObject.isPdf = true;
      }
    }
    return hier;
  }, {});

  return model;
};


export const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};


export const validateRequest = (requiredKeys = [], receivedKeys = []): boolean => {
  let invalidKeyFound = false;
  for (const key of receivedKeys) {
    if (requiredKeys.indexOf(key) === -1) {
      invalidKeyFound = true;
      break;
    }
  }
  return invalidKeyFound;
};

export function isEmpty(str: string) {
  return str === null || str === undefined || str.length === 0;
}
