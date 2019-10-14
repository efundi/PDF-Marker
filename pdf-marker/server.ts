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
import {extname, join, sep} from 'path';
import {access, constants, readdir, readdirSync, readFile, statSync, unlinkSync, writeFile, mkdir} from 'fs';

const { check, validationResult } = require('express-validator');
const multer = require('multer');
const extract = require('extract-zip');
const glob = require('glob');

const assignmentList = (callback) => {
  const folderModels = [];
  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return [];

    if (!isJson(data))
      return [];


    const config = JSON.parse(data.toString());
    readdir(config.defaultPath, (err, folders) => {
      // Handle error
      if(err)
        return new Error('Failed to read configurations!');

      folders.forEach(folder => {
        glob(config.defaultPath + '/' + folder + '/**', (err, files) => {
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


const CONFIG_FILE = 'config.json';
const CONFIG_DIR = './pdf-config/';
const UPLOADS_DIR = './uploads/';

const store = multer.diskStorage({
  destination: (req, file, cb) => {
    mkdir(UPLOADS_DIR, err => cb(err, UPLOADS_DIR));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({storage: store}).single('file');

const settingsPost = (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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
  return readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if(err)
      return res.status(500).send({ message: 'Failed to read configurations!'});

    if(!isJson(data))
      return res.status(200).send({});
    else
      return res.status(200).send(JSON.parse(data.toString()));
  })
};

app.get('/api/settings', settingsGet);

/*IMPORT API*/
const uploadFn = (req, res, next) => {
  readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if (err)
      return res.status(500).send({message: 'Failed to read configurations!'});

    if (!isJson(data))
      return res.status(404).send({message: 'Configure default location to extract files to on the settings page!'});

    upload(req, res, (err) => {
      if(err) {
        return res.status(501).json({error: err});
      }
      // Make file type validations
      console.log(req.file);
      const config = JSON.parse(data.toString());
      const mimeTypes = ["application/zip", "application/x-zip-compressed"];

      if(mimeTypes.indexOf(req.file.mimetype) == -1)
        return res.status(404).send({message: 'Not a valid zip file. Please select a file with a .zip extension!'});

      extractZip(UPLOADS_DIR + req.file.originalname, config.defaultPath + sep, true, res).then(() => {
        return res.status(200).send({message: 'Successfully extracted assignment to default folder!'});
      }).catch((error) => {
        return res.status(501).send({message: error.message});
      });

    });
  });
};

app.post('/api/import', uploadFn);

const getAssignments = (req, res) => {
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
          folderModels.push(hierarchyModel(files, config.defaultPath));

          if(folderModels.length == folderCount)
            return res.status(200).send(folderModels);
        });
      });

      console.log("response");

    });
  });
};

app.use('/api/assignments', getAssignments);

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
    if(stat.isFile()) {
      let path = pathInfo.replace(configFolder + '/', '');
      let pathObject: any = hier;
      path.split("/").forEach((item) => {
        if (!pathObject[item]) {
          pathObject[item] = {};
        }
        pathObject = pathObject[item];
      });

      pathObject.path = path;
      pathObject.basename = path.split("/").pop();
    }
    return hier;
  }, {});

  return model;
};
