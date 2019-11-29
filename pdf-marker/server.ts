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
import {extname, join, sep, dirname} from 'path';
import {access, constants, readdir, readdirSync, readFile, statSync, stat, unlinkSync, unlink, writeFile, mkdir, existsSync, createReadStream} from 'fs';
import { json2csv } from "json-2-csv";
import {ComponentFactory} from "@angular/core";
import {MarkTypeIconComponent} from "./src/app/modules/pdf-marker/components/mark-type-icon/mark-type-icon.component";

const { check, validationResult } = require('express-validator');
const multer = require('multer');
const extract = require('extract-zip');
const glob = require('glob');
const csvtojson = require('csvtojson');


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
      folders.forEach(folder => {
        glob(config.defaultPath + '/' + folder + '/**', (err, files) => {
          files.sort((a, b) => (a > b) ? 1:-1);
          folderModels.push(hierarchyModel(files, config.defaultPath));

          if(folderModels.length == folderCount)
            return res.status(200).send(folderModels);
        });
      });
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
                  console.log(gradesJSON[i]);
                  json2csv(gradesJSON, (err, csv) => {
                    if(err)
                      return res.status(400).send({ message: "Failed to convert json to csv!" });

                    writeFile(assignmentFolder + sep + "grades.csv", csv, (err) => {
                      if(err)
                        return res.status(500).send({ message: 'Failed to save marks to grades.csv file!' });
                      else
                        return res.status(200).send({message: 'Successfully saved marks!'});
                    });
                  });
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
    console.log(assignmentFolder);

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

/*const studentGrade = (req, res) => {
  if(!checkClient(req, res))
    return res.status(401).send({ message: 'Forbidden access to resource!'});
  const errors = validationResult(req);
  if(!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const keys = ["location", "totalMark"];
  const bodyKeys = Object.keys(req.body);

  if(validateRequest(keys, bodyKeys))
    return res.status(400).send({ message: 'Invalid parameter found in request' });

  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    const loc = req.body.location.replace(/\//g, sep);
    const number = parseFloat(req.body.totalMark);
    if(isNaN(number)) {
      return res.status(400).send({message: 'Not a valid mark provided'});
    }

    const pathSplit = loc.split(sep);
    if(pathSplit.length !== 4) {
      return res.status(404).send({message: 'Invalid path provided'});
    }

    const regEx = /(.*)\((.+)\)/;
    let assignmentName, studentNumber;
    if(!regEx.test(pathSplit[1])) {
      return res.status(404).send({message: 'Invalid student folder'});
    }

    const matches = regEx.exec(pathSplit[1]);

    assignmentName = pathSplit[0];
    studentNumber = matches[2];

    const config = JSON.parse(data.toString());
    const assignmentFolder =  dirname(dirname(dirname(config.defaultPath + sep + loc)));

    return access(assignmentFolder + sep + "grades.csv", constants.F_OK, (err) => {
      if(err)
        return res.status(200).send({message: 'Could not read grades file'});

      return csvtojson().fromFile(assignmentFolder + sep + "grades.csv")
        .then((gradesJSON) => {
          let changed = false;
          for(let i = 0; i < gradesJSON.length; i++) {
            if(gradesJSON[i] && gradesJSON[i][assignmentName] === studentNumber) {
              gradesJSON[i].field5 = number;
              changed = true;
              console.log(gradesJSON[i]);
              json2csv(gradesJSON, (err, csv) => {
                if(err)
                  return res.status(400).send({ message: "Failed to convert json to csv!" });

                writeFile(assignmentFolder + sep + "grades.csv", csv, (err) => {
                  if(err)
                    return res.status(500).send({ message: 'Failed to save marks to grades.csv file!' });
                  else
                    return res.status(200).send({message: 'Successfully saved marks!'});
                });
              });
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
};

app.post("/api/assignment/student/grade", [
  check('location').not().isEmpty().withMessage('Assignment location not provided!'),
  check('totalMark').not().isEmpty().withMessage('Assignment mark not provided!')
], studentGrade);*/

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

  /*return new Promise((resolve, reject) => extract(file, {dir: destination}, (err) => {
    if (!err) {
      if (deleteSource) unlink(file, (err) => {});
      nestedExtract(destination, extractZip);
      if(res)
        resolve(true);
    } else {
      console.log(err);
      console.log("no");
      reject(new Error('Error occurred while extracting file to disk!'));
      //return res.status(501).send({message: 'Error occurred while extracting file to disk!'});
    }
  }));*/
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

  // Maybe we should test speed of the above code and this one
  /*readdir(dir, (err, files) => {
    files.forEach(file => {
      stat(join(dir, file), (err, stats) => {
        if(stats.isFile()) {
          if (extname(file) === '.zip') {
            // deleteSource = true to avoid infinite loops caused by extracting same file
            zipExtractor(join(dir, file), dir, true);
          }
        } else {
          nestedExtract(join(dir, file), zipExtractor);
        }
      })
    });
  });*/
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
