/**
 * A tool greatly inspire by https://github.com/elwerene/libreoffice-convert/blob/master/index.js
 */
import {basename, dirname, extname, join, sep} from 'path';
import {platform, tmpdir} from 'os';
import {mkdtemp, rm, stat} from 'fs/promises';
import {ChildProcess, execFile} from 'node:child_process';
import {pathToFileURL} from 'url';
import {move} from 'fs-extra';
import {getConfig} from './config.handler';
import { isNil } from 'lodash';
import {IpcMainInvokeEvent} from 'electron';
import {workspaceRelativePathToAbsolute} from './assignment.handler';

/**
 * Look return a list of paths where libre office is normally located on the current operating system
 */
function findPaths(): Promise<string[]> {
  let paths = [];
  const platformName: string = platform();
  switch (platformName) {
    case 'darwin': paths = [...paths, '/Applications/LibreOffice.app/Contents/MacOS/soffice'];
      break;
    case 'linux': paths = [...paths, '/usr/bin/libreoffice', '/usr/bin/soffice', '/snap/bin/libreoffice'];
      break;
    case 'win32':
      paths = [
        ...paths,
        join(process.env['PROGRAMFILES(X86)'], 'LIBREO~1/program/soffice.exe'),
        join(process.env['PROGRAMFILES(X86)'], 'LibreOffice/program/soffice.exe'),
        join(process.env.PROGRAMFILES, 'LibreOffice/program/soffice.exe'),
      ];
      break;
    default:
      return Promise.reject(`Operating system not yet supported: ${platform}`);
  }
  return Promise.resolve(paths);
}

/**
 * Checks if the specified path exists, if not rejects
 * @param path
 */
function checkPathExist(path: string): Promise<string> {
  return stat(path).then(() => {
    return path;
  });
}


function findActualPath(paths: string[]): Promise<string> {
  const promises: Promise<string>[] = paths.map((potentialPath) => {
    return checkPathExist(potentialPath);
  });

  return Promise.any(promises)
    .then(
      (sofficePath) => sofficePath,
      () => Promise.reject('Could not find soffice binary')
    );
}

/**
 * -env:UserInstallation=file:///C:/Users/Charl-PC/AppData/Local/Temp/soffice-16000-7qlx6Djoss7u
 * --headless --convert-to .pdf
 * --outdir C:\Users\Charl-PC\AppData\Local\Temp\libreofficeConvert_-16000-Yi7VwPDFFQU4
 * C:\Users\Charl-PC\AppData\Local\Temp\libreofficeConvert_-16000-Yi7VwPDFFQU4\source
 * @param sofficePath
 * @param sourcePath
 * @param destPath
 */
function convert(sofficePath: string, sourcePath: string, destPath: string): Promise<void> {
  const ext = extname(sourcePath);
  const filename = basename(sourcePath, ext);
  return Promise.all([
    mkdtemp(join(tmpdir(), 'soffice')),
    mkdtemp(join(tmpdir(), 'libreofficeConvert_'))
  ])
    .then(([sofficeTemp, outputTemp]) => {
      const args: string[] = [
        `-env:UserInstallation=${pathToFileURL(sofficeTemp)}`,
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        outputTemp,
        sourcePath
      ];
      return new Promise<void>((resolve, reject) => {
        const childProcess: ChildProcess = execFile(sofficePath, args);
        let errorOut = '';
        childProcess.addListener('error', (err) => {
          reject(err);
        });
        childProcess.addListener('exit', () => {
          errorOut = errorOut.trim();
          if (errorOut.length === 0) {
            return resolve();
          } else {
            return reject(errorOut);
          }
        });
        childProcess.stderr.on('data', (data) => {
          errorOut += data;
        });
      })
        .then(() => {
          return move(outputTemp + sep + filename + '.pdf', destPath);
        })
        .then(
          () => {
            rm(sofficeTemp, {recursive: true});
            rm(outputTemp, {recursive: true});
          },
          (error) => {
            rm(sofficeTemp, {recursive: true});
            rm(outputTemp, {recursive: true});
            return Promise.reject(error);
          }
        );
    });
}

export function findLibreOfficePath(): Promise<string> {
  return findPaths()
    .then((paths) => findActualPath(paths));
}


export function libreConvertToPdf(sourceFilePath: string, destinationPath: string): Promise<void> {
  return getConfig()
    .then((config) => {
      if ( isNil(config.libreOfficePath)) {
        return Promise.reject('Libre office path not configured.');
      } else {
        return checkPathExist(config.libreOfficePath)
          .then(p => p, (error) => {
            return Promise.reject('Libre office path is not valid, please check settings.');
          });
      }
    })
    .then((sofficePath) => convert(sofficePath, sourceFilePath, destinationPath));
}

export function convertToPdf(
  event: IpcMainInvokeEvent,
  workspaceName: string,
  assignmentName: string,
  filePath: string): Promise<string> {

  return workspaceRelativePathToAbsolute(filePath).then((fileFullPath) => {
    const directory = dirname(fileFullPath);
    const ext = extname(fileFullPath);
    const fileName = basename(fileFullPath, ext);

    const outputPath = directory + sep + fileName + '.pdf';

    return libreConvertToPdf(fileFullPath, outputPath)
      .then(() => rm(fileFullPath))
      .then(() => {
        // Workspace relative path
        const b = dirname(filePath);
        return b + '/' + fileName + '.pdf';
      }, (error) => {
        return Promise.reject(error);
      });
  });
}

/**
 *
 * @param event
 */
export function libreOfficeFind(event: IpcMainInvokeEvent): Promise<string> {
  return findLibreOfficePath();
}


export function libreOfficeVersion(event: IpcMainInvokeEvent, librePath: string): Promise<string> {

  let promise: Promise<string>;
  if (process.platform === 'win32') {
    promise = libreOfficeVersionWindowsPowershell(librePath)
      .then(v => v, () => {
        // If using powershell did not work, try wmic
        return libreOfficeVersionWindowsWmic(librePath);
      });
  } else if (process.platform === 'linux' || process.platform === 'darwin') {
    promise = libreOfficeVersionUnix(librePath);
  } else {
    return Promise.reject('Unsupported platform');
  }

  return promise.then(
    v => v,
    (error) => {
      console.error(error);
      return Promise.reject('Could not determine Libre Office version. Please check configuration under app settings.');
    }
  );
}

function extractVersion(vString: string): string{
  if (isNil(vString)) {
    return null;
  } else {
    return vString.trim().match(/(\d\.\d(\.\d)*)/)[0];
  }
}

function libreOfficeVersionUnix(librePath: string): Promise<string> {
  let versionString = '';
  return new Promise<void>((resolve, reject) => {
    const childProcess: ChildProcess = execFile(librePath, ['--version']);
    childProcess.on('error', reject);
    childProcess.on('exit', resolve);
    childProcess.stdout.on('data', (data) => {
      versionString += data;
    });
  }).then(() => {
    return extractVersion(versionString);
  });
}

function libreOfficeVersionWindowsPowershell(librePath: string): Promise<string> {
  let versionString = '';

  const args = ['-NoLogo', '-NoProfile', '-Command', '(Get-Item -Path \'' + librePath + '\').VersionInfo.ProductVersion'];
  return new Promise<void>((resolve, reject) => {
    const childProcess: ChildProcess = execFile('powershell', args);
    childProcess.on('error', reject);
    childProcess.on('exit', resolve);
    childProcess.stdout.on('data', (data) => {
      versionString += data;
    });
  }).then(() => {
    return extractVersion(versionString);
  });
}

function libreOfficeVersionWindowsWmic(librePath: string): Promise<string> {
  let versionString = '';
  librePath = librePath.replaceAll('\\', '\\\\');
  const args = ['datafile', 'where', 'name=\"' + librePath + '\"', 'get', 'version'];
  return new Promise<void>((resolve, reject) => {
    const childProcess: ChildProcess = execFile('wmic', args);
    childProcess.on('error', reject);
    childProcess.on('exit', resolve);
    childProcess.stdout.on('data', (data) => {
      versionString += data;
    });
    childProcess.stdin.end();
  }).then(() => {
    return extractVersion(versionString.split('\n')[1]); // "7.5.0.3"
  });
}
