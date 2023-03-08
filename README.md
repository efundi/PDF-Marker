# PDF Marker [![Node.js CI](https://github.com/efundi/PDF-Marker/actions/workflows/node.js.yml/badge.svg)](https://github.com/efundi/PDF-Marker/actions/workflows/node.js.yml)

An application to mark PDF assignments. Assignments can be sourced from Sakai, a generic zip file, 
or individually imported PDF files.

## Development Setup

### Pre-requisites
- NodeJS 18
- Angular CLI 14

**If you are changing branches from a major version of PDFM clear the node_module directory and reinstall dependencies**

### Install dependencies
```bash
npm install
```

### Run
The run electron with hot reloading
```bash
npm run electron:local
```

### Run with hot reloading
Hot loading works by having the Angular CLI build and serve the static content on port 4200, 
and electron is configured to get the files from there, instead of locally packaged static content.
```bash
npm run start
```

For more guides see
- [IDE Setup](docs/ide.md)
- [Debugging](docs/debugging.md)
- [NVM for NodeJS versions](docs/nvm.md)
- [Creating Releases](docs/releases.md)
- [Generate APIs](docs/generate.md)
