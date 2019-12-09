/**
 * *** NOTE ON IMPORTING FROM ANGULAR AND NGUNIVERSAL IN THIS FILE ***
 *
 * If your application uses third-party dependencies, you'll need to
 * either use Webpack or the Angular CLI's `bundleDependencies` feature
 * in order to adequately package them for use on the server without a
 * node_modules directory.
 *
 * However, due to the nature of the CLI's `bundleDependencies`, importing
 * Angular in this file will create a different instance of Angular than
 * the version in the compiled application code. This leads to unavoidable
 * conflicts. Therefore, please do not explicitly import from @angular or
 * @nguniversal in this file. You can export any needed resources
 * from your application's main.server.ts file, as seen below with the
 * import for `ngExpressEngine`.
 */

import 'zone.js/dist/zone-node';

import * as express from 'express';
import {basename, dirname, extname, join, sep} from 'path';
import {
  access, accessSync,
  constants,
  createReadStream,
  existsSync,
  mkdir,
  readdir,
  readdirSync,
  readFile,
  readFileSync,
  statSync,
  unlinkSync,
  writeFile, writeFileSync
} from 'fs';
import {json2csv} from "json-2-csv";
import {PDFDocument, PDFPage, rgb} from 'pdf-lib';
import {AnnotationFactory} from 'annotpdf';
import {IconTypeEnum} from "./src/app/modules/pdf-marker/info-objects/icon-type.enum";
import {IconSvgEnum} from "./src/app/modules/pdf-marker/info-objects/icon-svg.enum";

const { check, validationResult } = require('express-validator');
const multer = require('multer');
const extract = require('extract-zip');
const glob = require('glob');
const csvtojson = require('csvtojson');
const hexRgb = require('hex-rgb');
const pathinfo = require('locutus/php/filesystem/pathinfo');


const CONFIG_FILE = 'config.json';
const CONFIG_DIR = './pdf-config/';
const UPLOADS_DIR = './uploads';

const assignmentList = (callback) => {
  const folderModels = [];
  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return [];

    if (!isJson(data))
      return [];

    const config = JSON.parse(data.toString());
    readdir(config.defaultPath, (err, folders) => {
      if(err)
        return new Error('Failed to read workspace contents!');

      folders.forEach(folder => {
        glob(config.defaultPath + '/' + folder + '/**', (err, files) => {
          files.sort((a, b) => (a > b) ? 1:-1);
          folderModels.push(hierarchyModel(files, config.defaultPath));
        });
      });

      callback(null, folderModels);
    });

  });
};

// Express server
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4200;
const DIST_FOLDER = join(process.cwd(), 'dist/browser');

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const {AppServerModuleNgFactory, LAZY_MODULE_MAP, ngExpressEngine, provideModuleMap} = require('./dist/server/main');

// Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
app.engine('html', ngExpressEngine({
  bootstrap: AppServerModuleNgFactory,
  providers: [
    provideModuleMap(LAZY_MODULE_MAP),
    {provide: 'ASSIGNMENT_LIST', useValue: assignmentList}
  ]
}));

app.set('view engine', 'html');
app.set('views', DIST_FOLDER);

// Example Express Rest API endpoints
// app.get('/api/**', (req, res) => { });
// Serve static files from /browser
app.get('*.*', express.static(DIST_FOLDER, {
  maxAge: '1y'
}));


const store = multer.diskStorage({
  destination: (req, file, cb) => {
    if(!existsSync(UPLOADS_DIR)) {
      mkdir(UPLOADS_DIR, err => cb(err, UPLOADS_DIR));
    } else {
      cb(null, UPLOADS_DIR)
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({storage: store}).single('file');

const checkClient = (req, res) => {
  return (req.headers.client_id && req.headers.client_id === "PDF_MARKER");
};

const settingsPost = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  const errors = validationResult(req);
  if(!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  return access(req.body.defaultPath, constants.F_OK, (err) => {
    if(err)
      return res.status(404).send({ message: `Path '${req.body.defaultPath}' not found!`});
    else {
      const data = new Uint8Array(Buffer.from(JSON.stringify(req.body)));
      writeFile(CONFIG_DIR + CONFIG_FILE, data, (err) => {
        if(err)
          return res.status(500).send({ message: 'Failed to save configurations!'});
        else
          return res.status(200).send({message: 'Successfully saved!'});
      });
    }
  });
};

app.post('/api/settings', [
    check('lmsSelection').not().isEmpty().withMessage('LMS type not provided!'),
    check('defaultPath').not().isEmpty().withMessage('Default path not provided!')
  ], settingsPost);

const settingsGet = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});

  if(!existsSync(CONFIG_DIR)) {
    mkdir(CONFIG_DIR, err => {
      if (err)
        return res.status(500).send({message: 'Failed to create configuration directory!'});
      return readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
        if (err)
          return res.status(500).send({message: 'Failed to read configurations!'});

        if (!isJson(data))
          return res.status(200).send({});
        else
          return res.status(200).send(JSON.parse(data.toString()));
      })
    });
  } else {
    return readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
      if (err)
        return res.status(500).send({message: 'Failed to read configurations!'});

      if (!isJson(data))
        return res.status(200).send({});
      else
        return res.status(200).send(JSON.parse(data.toString()));
    })
  }
};

app.get('/api/settings', settingsGet);

/*IMPORT API*/
const uploadFn = (req, res, next) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    upload(req, res, (err) => {
      if(err)
        return res.status(501).json({error: err});

      if(!req.file)
        return res.status(404).send({message: 'No file uploaded!'});

      const config = JSON.parse(data.toString());
      const mimeTypes = ["application/zip", "application/x-zip-compressed"];

      if(mimeTypes.indexOf(req.file.mimetype) == -1)
        return res.status(404).send({message: 'Not a valid zip file. Please select a file with a .zip extension!'});

      extractZip(UPLOADS_DIR + sep + req.file.originalname, config.defaultPath + sep, true, res).then(() => {
        return res.status(200).send({message: 'Successfully extracted assignment to default folder!'});
      }).catch((error) => {
        return res.status(501).send({message: error.message});
      });
    });
  });
};

app.post('/api/import', uploadFn);

const getAssignments = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    const config = JSON.parse(data.toString());

    const folderModels = [];
    readdir(config.defaultPath, (err, folders) => {
      if(err)
        return res.status(501).send({message: 'Error retrieving assignments'});

      const folderCount = folders.length;
      if(folders.length) {
        folders.forEach(folder => {
          glob(config.defaultPath + '/' + folder + '/**', (err, files) => {
            files.sort((a, b) => (a > b) ? 1 : -1);
            folderModels.push(hierarchyModel(files, config.defaultPath));

            if (folderModels.length == folderCount)
              return res.status(200).send(folderModels);
          });
        });
      } else {
        return res.status(200).send([]);
      }
    });
  });
};

app.get('/api/assignments', getAssignments);

const getPdfFile = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  const errors = validationResult(req);
  if(!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);
    const actualPath = config.defaultPath + sep + loc;

    return access(actualPath, constants.F_OK, (err) => {
      if(err)
        return res.status(404).send({ message: `pdf file not found!`});

      const file = createReadStream(actualPath);
      file.pipe(res);
    });
  });
};

app.post('/api/pdf/file', [
  check('location').not().isEmpty().withMessage('File location not provided!')
], getPdfFile);

const isNullOrUndefined = (object: any): boolean => {
  return (object === null || object === undefined);
};

const savingMarks = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  if(req.body.location === null || req.body.location === undefined)
    return res.status(400).send({message: 'File location not provided'});

  const marks = Array.isArray(req.body.marks) ? req.body.marks:[];
  let totalMark = 0;
  if(!isNullOrUndefined(marks)) {
    const pages = Object.keys(marks);
    pages.forEach(page => {
      if (Array.isArray(marks[page])) {
        for (let i = 0; i < marks[page].length; i++) {
          totalMark += (marks[page][i] && marks[page][i].totalMark) ? marks[page][i].totalMark:0;
        }
      }
    });
  }

  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);
    const pathSplit = loc.split(sep);
    if(pathSplit.length !== 4) {
        return res.status(404).send({message: 'Invalid path provided'});
    }

    const regEx = /(.*)\((.+)\)/;
    if(!regEx.test(pathSplit[1])) {
      return res.status(404).send({message: 'Invalid student folder'});
    }

    const studentFolder = dirname(dirname(config.defaultPath + sep + loc));

    return access(studentFolder, constants.F_OK, (err) => {
      if(err)
        return res.status(404).send({ message: `Student folder not found!`});

      const data = new Uint8Array(Buffer.from(JSON.stringify(marks)));
      writeFile(studentFolder + sep + '.marks.json', data, (err) => {
        if(err)
          return res.status(500).send({ message: 'Failed to save student marks!'});

        const matches = regEx.exec(pathSplit[1]);

        const assignmentName = pathSplit[0];
        const studentNumber = matches[2];

        const assignmentFolder =  dirname(studentFolder);

        return access(assignmentFolder + sep + "grades.csv", constants.F_OK, (err) => {
          if(err)
            return res.status(200).send({message: 'Could not read grades file'});

          return csvtojson().fromFile(assignmentFolder + sep + "grades.csv")
            .then((gradesJSON) => {
              let changed = false;
              for(let i = 0; i < gradesJSON.length; i++) {
                if(gradesJSON[i] && gradesJSON[i][assignmentName] === studentNumber) {
                  gradesJSON[i].field5 = totalMark;
                  changed = true;
                  json2csv(gradesJSON, (err, csv) => {
                    if(err)
                      return res.status(400).send({ message: "Failed to convert json to csv!" });

                    writeFile(assignmentFolder + sep + "grades.csv", csv, (err) => {
                      if(err)
                        return res.status(500).send({ message: 'Failed to save marks to grades.csv file!' });
                      else
                        return res.status(200).send({message: 'Successfully saved marks!'});
                    });
                  }, {emptyFieldValue: ''});
                  break;
                }
              }

              if(changed) {
                // more logic to save new JSON to CSV
              } else {
                return res.status(400).send({message: "Failed to save mark" });
              }

            })
            .catch(reason => {
              return res.status(400).send({message: reason });
            })
        });
      });
    });
  });
};

app.post("/api/assignment/marks/save", savingMarks);

const getMarks = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  const errors = validationResult(req);
  if(!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);
    const pathSplit = loc.split(sep);
    if(pathSplit.length !== 4) {
      return res.status(404).send({message: 'Invalid path provided'});
    }

    const regEx = /(.*)\((.+)\)/;
    if(!regEx.test(pathSplit[1])) {
      return res.status(404).send({message: 'Invalid student folder'});
    }

    const studentFolder = dirname(dirname(config.defaultPath + sep + loc));

    return readFile(studentFolder + sep + ".marks.json",(err, data) => {
      if(err)
        return res.status(200).send([]);

      if(!isJson(data))
        return res.status(200).send([]);
      else
        return res.status(200).send(JSON.parse(data.toString()));
    });
  });
};

app.post("/api/assignment/marks/fetch", [
  check('location').not().isEmpty().withMessage('Assignment location not provided!')
], getMarks);

const assignmentSettings = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});

  const errors = validationResult(req);
  if(!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const assignmentSettings = (req.body.settings !== null && req.body.settings !== undefined) ? req.body.settings:{};
  if(JSON.stringify(assignmentSettings) === JSON.stringify({}))
    return res.status(200).send();

  // Check object compliance
  const keys = ["defaultColour"];
  const assignmentSettingsKeys = Object.keys(assignmentSettings);
  let invalidKeyFound = false;
  assignmentSettingsKeys.forEach(key => {
    invalidKeyFound = (keys.indexOf(key) === -1);
  });

  if(invalidKeyFound)
    return res.status(400).send({ message: 'Invalid key found in settings'});

  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);
    const pathSplit = loc.split(sep);
    if(pathSplit.length !== 4) {
      return res.status(404).send({message: 'Invalid path provided'});
    }

    const regEx = /(.*)\((.+)\)/;
    if(!regEx.test(pathSplit[1])) {
      return res.status(404).send({message: 'Invalid student folder'});
    }

    const assignmentFolder = dirname(dirname(dirname(config.defaultPath + sep + loc)));
    const buffer = new Uint8Array(Buffer.from(JSON.stringify(assignmentSettings)));

    return access(assignmentFolder, constants.F_OK, (err) => {
      if(err)
        return res.status(404).send({ message: `Path '${loc}' not found!`});
      else {
        writeFile(assignmentFolder + sep + '.settings.json', buffer, (err) => {
          if(err)
            return res.status(500).send({ message: 'Failed to save assignment settings!'});
          else
            return res.status(200).send(assignmentSettings);
        });
      }
    });
  });
};

app.post('/api/assignment/settings', [
  check('location').not().isEmpty().withMessage('Assignment location not provided!')
], assignmentSettings);

const getAssignmentSettings = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  const errors = validationResult(req);
  if(!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);
    const pathSplit = loc.split(sep);
    if(pathSplit.length !== 4) {
      return res.status(404).send({message: 'Invalid path provided'});
    }

    const regEx = /(.*)\((.+)\)/;
    if(!regEx.test(pathSplit[1])) {
      return res.status(404).send({message: 'Invalid student folder'});
    }

    const assignmentFolder = dirname(dirname(dirname(config.defaultPath + sep + loc)));

    return readFile(assignmentFolder + sep + ".settings.json",(err, data) => {
      if(err)
        return res.status(200).send({});

      if(!isJson(data))
        return res.status(200).send({});
      else
        return res.status(200).send(JSON.parse(data.toString()));
    });
  });
};

app.post("/api/assignment/settings/fetch", [
  check('location').not().isEmpty().withMessage('Assignment location not provided!')
], getAssignmentSettings);

const getGrades = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  const errors = validationResult(req);
  if(!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const keys = ["location"];
  const bodyKeys = Object.keys(req.body);

  if(validateRequest(keys, bodyKeys))
    return res.status(400).send({ message: 'Invalid parameter found in request' });

  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);

    const assignmentFolder = config.defaultPath + sep + loc;

    return access(assignmentFolder + sep + "grades.csv", constants.F_OK, (err) => {
      if(err)
        return res.status(200).send({message: 'Could not read grades file'});
      return csvtojson().fromFile(assignmentFolder + sep + "grades.csv")
        .then((gradesJSON) => {
          return res.status(200).send(gradesJSON)
        })
        .catch(reason => {
          return res.status(400).send({message: reason });
        })
    });
  });
};

app.post("/api/assignment/grade", [
  check('location').not().isEmpty().withMessage('Assignment location not provided!')
], getGrades);

const validateRequest = (requiredKeys = [], recievedKeys = []): boolean => {
  let invalidKeyFound = false;
  for(let key of recievedKeys) {
    if(requiredKeys.indexOf(key) == -1) {
      invalidKeyFound = true;
      break;
    }
  }
  return invalidKeyFound;
};

const finalizeAssignment = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  const errors = validationResult(req);
  if(!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const keys = ["location"];
  const bodyKeys = Object.keys(req.body);

  if(validateRequest(keys, bodyKeys))
    return res.status(400).send({ message: 'Invalid parameter found in request' });

  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);

    const assignmentFolder = config.defaultPath + sep + loc;

    let count = 0;
    glob(assignmentFolder + sep + "/*", (err, files) => {
      if(err)
        return res.status(400).send({message: "Failed to read assignment '" + loc + "' submissions!"});

      files.forEach(file => {
        if(statSync(file).isDirectory()) {
          const regEx = /(.*)\((.+)\)$/;
          if(!regEx.test(file)) {
            return res.status(400).send({message: 'Invalid student folder ' + basename(file)});
          }

          const matches = regEx.exec(file);

          glob(file + sep + "Submission attachment(s)/*", (err, submissionFiles) => {
            submissionFiles.forEach(submission => {
              try {
                accessSync(submission, constants.F_OK);
                const studentFolder = dirname(dirname(submission));

                return readFile(studentFolder + sep + ".marks.json", (err, data) => {
                  let marks;
                  if(err)
                    marks = [];

                  if(!isJson(data))
                    marks = [];
                  else
                    marks = JSON.parse(data.toString());

                  if(marks.length > 0)  {
                    const annotateFN = async (): Promise<{pdfBytes: Uint8Array, totalMark:number}> => {
                      return await annotatePdfFile(res, submission, marks);
                    };

                    return annotateFN().then((data) => {
                      const fileName = pathinfo(submission, 'PATHINFO_FILENAME') + "_MARK" + new Date().getTime();
                      writeFileSync(studentFolder + sep + "Feedback Attachment(s)" + sep + fileName + ".pdf", data.pdfBytes);
                      accessSync(assignmentFolder + sep + "grades.csv", constants.F_OK);
                      return csvtojson().fromFile(assignmentFolder + sep + "grades.csv")
                        .then((gradesJSON) => {
                          let changed = false;
                          for(let i = 0; i < gradesJSON.length; i++) {
                            if(gradesJSON[i] && gradesJSON[i][loc] === matches[2]) {
                              gradesJSON[i].field5 = data.totalMark;
                              changed = true;
                              json2csv(gradesJSON, (err, csv) => {
                                if(err)
                                  return res.status(400).send({ message: "Failed to convert json to csv!" });

                                writeFile(assignmentFolder + sep + "grades.csv", csv, (err) => {
                                  if(err)
                                    return res.status(500).send({ message: 'Failed to save marks to grades.csv file!' });
                                });
                              }, {emptyFieldValue: ''});
                              break;
                            }
                          }

                          if(changed) {
                            // more logic to save new JSON to CSV
                          } else {
                            return res.status(400).send({message: "Failed to save mark" });
                          }

                        })
                        .catch(reason => {
                          return res.status(400).send({message: reason });
                        })
                    }, (error) => {
                      return res.status(400).send({message: error});
                    });
                  }
                });
              } catch (e) {
                return res.status(400).send({message: e.message});
              }
            })
          })
        }
      });

      return res.status(200).send({message: 'Successfully updated all records'});
    });
  });
};

app.post("/api/assignment/finalize", [
  check('location').not().isEmpty().withMessage('Assignment location not provided!')
], finalizeAssignment);

const getRgbScale = (rgbValue: number): number => {
  return +parseFloat(((rgbValue / 255) + "")).toFixed(2);
};

const annotatePdfFile = async (res, filePath: string, marks = []) => {
  let totalMark = 0;
  let generalMarks = 0;
  let  allMarks: string[]= ["Results", "======="];
  let longestStringCount = allMarks[0].length;
  const file = readFileSync(filePath);
  const pdfFactory =  new AnnotationFactory(file);
  let pdfDoc = await PDFDocument.load(file);
  let pdfPages: PDFPage[] = await pdfDoc.getPages();
  let pageCount: number = 1;
  pdfPages.forEach((pdfPage: PDFPage) => {
    if (Array.isArray(marks[pageCount - 1])) {
      marks[pageCount - 1].forEach(mark => {
        const coords = mark.coordinates;
        if(mark.iconType === IconTypeEnum.NUMBER) {
          totalMark += (mark.totalMark) ? mark.totalMark:0;
          pdfFactory.createTextAnnotation(pageCount - 1, [(coords.x * 72 / 96), pdfPage.getHeight() - (coords.y * 72 / 96) - 24, pdfPage.getWidth() - (coords.y * 72 / 96), pdfPage.getHeight() - (coords.y * 72 / 96)], 'Mark Value: ' + mark.totalMark + ' Marking Comment: ' +  mark.comment, mark.sectionLabel);
          let content = mark.sectionLabel + " = " + mark.totalMark;
          longestStringCount = (content.length > longestStringCount) ? content.length:longestStringCount;
          allMarks.push(content);
        }
      });
    }
    pageCount++;
  });

  pageCount = 1;
  pdfDoc = await PDFDocument.load(pdfFactory.write());
  pdfPages = await pdfDoc.getPages();
  pdfPages.forEach((pdfPage: PDFPage) => {
    if (Array.isArray(marks[pageCount - 1])) {
      marks[pageCount - 1].forEach(mark => {
        const colours = hexRgb(mark.colour);
        const coords = mark.coordinates;
        const options = {
          x: (coords.x * 72 / 96) + 4,
          y: pdfPage.getHeight() - (coords.y * 72 / 96),
          borderColor: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
          color: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
        };

        if(mark.iconType !== IconTypeEnum.NUMBER) {
          totalMark += (mark.totalMark) ? mark.totalMark:0;
          generalMarks += (mark.totalMark) ? mark.totalMark:0;
          if(mark.iconType === IconTypeEnum.FULL_MARK) {
            pdfPage.drawSvgPath(IconSvgEnum.FULL_MARK_SVG, options);
          } else if(mark.iconType === IconTypeEnum.HALF_MARK) {
            pdfPage.drawSvgPath(IconSvgEnum.FULL_MARK_SVG, options);
            pdfPage.drawSvgPath(IconSvgEnum.HALF_MARK_SVG, {
              x: (coords.x * 72 / 96) + 4,
              y: pdfPage.getHeight() - (coords.y * 72 / 96),
              borderWidth: 2,
              borderColor: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
              color: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
            });
          } else if(mark.iconType === IconTypeEnum.CROSS) {
            pdfPage.drawSvgPath(IconSvgEnum.CROSS_SVG, options);
          } else if(mark.iconType === IconTypeEnum.ACK_MARK) {
            pdfPage.drawSvgPath(IconSvgEnum.ACK_MARK_SVG, options);
          }
        }
      });
    }
    pageCount++;
  });

  const resultPage: PDFPage = pdfDoc.addPage();
  let i = 0;
  let y = 0;
  allMarks.forEach(markString => {
    y += 12;
    if(i == 1)
      resultPage.drawText("=======", {x: 5, y: resultPage.getHeight() -  y, size: 12});

    resultPage.drawText(markString, {x: 5, y: resultPage.getHeight() -  y, size: 12});
    resultPage.moveUp(12);
    i++;
  });

  y += 12;
  resultPage.drawText( "General Marks = " + generalMarks.toString(), {x: 5, y: resultPage.getHeight() -  y, size: 12});
  resultPage.moveUp(12);

  y += 12;
  resultPage.drawText( "======================", {x: 5, y: resultPage.getHeight() -  y, size: 12});
  resultPage.moveUp(12);

  y += 12;
  resultPage.drawText( "Total Marks \t\t\t\t\t\t" + totalMark.toString(), {x: 5, y: resultPage.getHeight() -  y, size: 12});
  /*let ruler = "";
  for(let i = 0; i < longestStringCount; i++) {
    ruler += "=";
  }
  resultPage.drawText(ruler, { size: 24, x: 5});
  resultPage.moveUp(24);
  resultPage.drawText("General Marks = " + generalMarks, { size: 24, x: 5});*/
  const newPdfBytes = await pdfDoc.save();
  return Promise.resolve({pdfBytes: newPdfBytes, totalMark: totalMark});
};

// All regular routes use the Universal engine
app.get('*', (req, res) => {
  res.render('index', { req });
});

// Start up the Node server
app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});

const isJson = (str) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

const extractZip = (file, destination, deleteSource, res = null) => {
  return new Promise((resolve, reject) => extract(file, {dir: destination}, (err) => {
    if (!err) {
      if (deleteSource) unlinkSync(file);
      nestedExtract(destination, extractZip);
      if(res)
        resolve(true);
    } else {
      console.log(err);
      console.log("no");
      reject(new Error('Error occurred while extracting file to disk!'));
      //return res.status(501).send({message: 'Error occurred while extracting file to disk!'});
    }
  }));
};

const nestedExtract = (dir, zipExtractor) => {
  readdirSync(dir).forEach((file) => {
    if (statSync(join(dir, file)).isFile()) {
      if (extname(file) === '.zip') {
        // deleteSource = true to avoid infinite loops caused by extracting same file
        zipExtractor(join(dir, file), dir, true);
      }
    } else {
      nestedExtract(join(dir, file), zipExtractor);
    }
  });
};

const hierarchyModel = (pathInfos, configFolder) => {
  const pattern = /\\/g;
  configFolder = configFolder.replace(pattern, '/');
  let model = pathInfos.reduce((hier, pathInfo) => {
    let stat = statSync(pathInfo);
    let path = pathInfo.replace(configFolder + '/', '');
    let pathObject: any = hier;
    let pathSplit = path.split("/");
    path.split("/").forEach((item) => {
      if (!pathObject[item]) {
        pathObject[item] = {};
      }
      pathObject = pathObject[item];
    });

    if(stat.isFile()) {
      pathObject.path = path;
      pathObject.basename = path.split("/").pop();
      if (pathSplit.indexOf('Submission attachment(s)') > -1)
        pathObject.isPdf = true;
    }
    return hier;
  }, {});

  return model;
};
