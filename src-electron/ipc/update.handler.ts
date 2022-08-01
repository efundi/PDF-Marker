import {UpdateCheckResult, UpdateInfo} from '@shared/info-objects/update-info';
import {autoUpdater, UpdateCheckResult as ElectronUpdateCheckResult} from 'electron-updater';
import {isNil} from 'lodash';

let latestUpdate: ElectronUpdateCheckResult = null;

export function checkForUpdates(): Promise<UpdateCheckResult> {
  return autoUpdater.checkForUpdates().then((update) => {
    latestUpdate = update;
    const canSkip = autoUpdater.allowPrerelease;
    return {
      ...update,
      canSkip // Only if pre-releases are enabled can it be skipped
    };
  });
}

export function downloadUpdate(): Promise<UpdateInfo> {
  if (isNil(latestUpdate)) {
    return Promise.reject('No update available');
  }
  return autoUpdater.downloadUpdate(latestUpdate.cancellationToken).then(() => {
    return latestUpdate.updateInfo;
  });
}

export function restartApplication(): Promise<any> {
  autoUpdater.quitAndInstall();
  return Promise.resolve();
}
