# PdfMarker

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 13.1.3.

## Development Setup

### Pre-requisites
- NodeJS 16
- Angular CLI 13

### Install dependencies
```bash
npm install
```


### Run with hot reloading

After compiling the backend, you can run the front-end with hot reloading, by which any code changes in Angular will be automatically reloaded in the electron window.

This works be having electron run its services on port 4300 and the angular server running on 4200 while proxying api calls to the backend (running on 4300)

Files involved to make this work included

- `proxy.conf.json` Angular’s proxy file
- `environment.electron.ts` (an environment file configured for the electron build)

The run electron with hot reloading
Make sure the server side is built
```bash
npm run build:ssr
```
Run electron
```bash
npm run electron
```



## Test the application
The application will start with web debugger open
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
