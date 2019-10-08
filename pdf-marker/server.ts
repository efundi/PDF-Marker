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
import {join} from 'path';

// Express server
const app = express();
const fs = require('fs');
const { check, validationResult } = require('express-validator');
app.use(express.json());

const PORT = process.env.PORT || 4000;
const DIST_FOLDER = join(process.cwd(), 'dist/browser');

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const {AppServerModuleNgFactory, LAZY_MODULE_MAP, ngExpressEngine, provideModuleMap} = require('./dist/server/main');

// Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
app.engine('html', ngExpressEngine({
  bootstrap: AppServerModuleNgFactory,
  providers: [
    provideModuleMap(LAZY_MODULE_MAP)
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


const CONFIG_FILE = "config.json";
const CONFIG_DIR = "./pdf-config/";

app.post('/api/settings', [
    check('lmsSelection').not().isEmpty().withMessage('LMS type not provided!'),
    check('defaultPath').not().isEmpty().withMessage('Default path not provided!')
  ], (req, res) => {
  console.log(process.env.HOME)
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  return fs.access(req.body.defaultPath, fs.constants.F_OK, (err) => {
    if(err)
      return res.status(404).send({ message: `Path '${req.body.defaultPath}' not found!`});
    else {
      const data = new Uint8Array(Buffer.from(JSON.stringify(req.body)));
      fs.writeFile(CONFIG_DIR + CONFIG_FILE, data, (err) => {
        if(err)
          return res.status(500).send({ message: 'Failed to save configurations!'});
        else
          return res.status(200).send({message: 'Successfully saved!'});
      });
    }
  });
});

app.get('/api/settings', (req, res) => {
  return fs.readFile(CONFIG_DIR + CONFIG_FILE, (err, data) => {
    if(err)
      return res.status(500).send({ message: 'Failed to read configurations!'});

    if(!isJson(data))
      return res.status(200).send({});
    else
      return res.status(200).send(JSON.parse(data));
  })
});

// All regular routes use the Universal engine
app.get('*', (req, res) => {
  res.render('index', { req });
});

// Start up the Node server
app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});

function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
