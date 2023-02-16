/**
 * A tool greatly inspire by https://github.com/elwerene/libreoffice-convert/blob/master/index.js
 */
import {basename, extname, join, sep} from 'path';
import {platform, tmpdir} from 'os';
import {mkdtemp, rm, stat} from 'fs/promises';
import {ChildProcess, execFile} from 'node:child_process';
import {pathToFileURL} from 'url';
import {move} from 'fs-extra';

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

function findActualPath(paths: string[]): Promise<string> {
  const promises: Promise<string>[] = paths.map((potentialPath) => {
    return stat(potentialPath).then(() => {
      return potentialPath;
    });
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
        childProcess.addListener('error', reject);
        childProcess.addListener('exit', resolve);
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

export function libreConvertToPdf(sourceFilePath: string, destinationPath: string): Promise<void> {
  return findPaths()
    .then((paths) => findActualPath(paths))
    .then((sofficePath) => convert(sofficePath, sourceFilePath, destinationPath));
}
