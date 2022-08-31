# PdfMarker [![Node.js CI](https://github.com/efundi/PDF-Marker/actions/workflows/node.js.yml/badge.svg)](https://github.com/efundi/PDF-Marker/actions/workflows/node.js.yml)

An application to mark PDF assignments. Assignments can be sourced from Sakai, a generic zip file, 
or individually imported PDF files.

## Development Setup

### Pre-requisites
- NodeJS 16
- Angular CLI 13

### Install dependencies
```bash
npm install
```

### Run with hot reloading
The run electron with hot reloading
```bash
npm run start
```

## Deploy new version
Make sure to set the appropriate version in `package.json`. Make use of "preRelease" versions if it is not
the final stable build e.g. `x.x.x-alpha.1`, `x.x.x-beta.1`.

Make sure all is committed and pushed to github

Set an environment variable with your github token
```bash
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Run the build
```bash
npm run deploy
```
It will deploy a draft release on github. Make sure the details are correct on this draft.
Mark it as a "pre release" if it is intended to be released as such.
