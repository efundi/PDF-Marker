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
import {join, sep} from 'path';
import {createReadStream, readdirSync, readFile} from 'fs';
import {
  CONFIG_DIR,
  CONFIG_FILE,
  FORBIDDEN_RESOURCE,
  NOT_CONFIGURED_CONFIG_DIRECTORY,
  NOT_PROVIDED_COMMENT,
  NOT_PROVIDED_RUBRIC,
} from './src-express/constants';

import {
  checkAccess,
  checkClient,
  hierarchyModel,
  isJson,
  readFromFile,
  sendResponse,
  sendResponseData
} from './src-express/utils';
import {
  getRubricsFn,
  rubricUploadFn
} from './src-express/rest/rubric';

import {check, validationResult} from 'express-validator';
import * as glob from 'glob';

/*
 * These next few lines are to create mocks for Angular SSR
 * PDF.js requires access to some DOM level functions that
 * isn't available on the server side. We will be creating mocks here
 */
// ssr DOM
import * as domino from 'domino';
// for mock global window by domino
const win = domino.createWindow('<html>');
// mock
global['window'] = win as any;
// not implemented property and functions
Object.defineProperty(win.document.body.style, 'transform', {
  value: () => {
    return {
      enumerable: true,
      configurable: true,
    };
  },
});
// mock documnet
global['document'] = win.document;
global['HTMLAnchorElement'] = (win as any).HTMLAnchorElement;

global.window.requestAnimationFrame = function(callback) {
  callback(0);
  return 0;
};

// Express server
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4300;
const DIST_FOLDER = join(process.cwd(), 'dist/browser');

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const {AppServerModuleNgFactory, ngExpressEngine} = require('./dist/server/main');

// Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
app.engine('html', ngExpressEngine({
  bootstrap: AppServerModuleNgFactory,
}));

app.set('view engine', 'html');
app.set('views', DIST_FOLDER);

// Example Express Rest API endpoints
// app.get('/api/**', (req, res) => { });
// Serve static files from /browser
app.get('*.*', express.static(DIST_FOLDER, {
  maxAge: '1y'
}));


app.post('/api/rubric/import', [
  check('rubricName').not().isEmpty().withMessage(NOT_PROVIDED_RUBRIC)
], rubricUploadFn);
/*END RUBRIC IMPORT API*/


/* READ RUBRICS */


app.get('/api/rubric/import', getRubricsFn);
/* END READ RUBRICS */

/* DELETE RUBRICS */

const getPdfFile = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  return readFromFile(req, res, CONFIG_DIR + CONFIG_FILE, (data) => {
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }

    const config = JSON.parse(data.toString());
    const loc = req.body.location.replace(/\//g, sep);
    const actualPath = config.defaultPath + sep + loc;
    console.log('Get PDF: ' + actualPath);
    return checkAccess(req, res, actualPath, () => {
      const file = createReadStream(actualPath);
      file.pipe(res);
    });
  });
};

app.post('/api/pdf/file', [
  check('location').not().isEmpty().withMessage('File location not provided!')
], getPdfFile);


// All regular routes use the Universal engine
app.get('*', (req, res) => {
  res.render('index', {req});
});

// Start up the Node server
app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});




