import {UpdateCheckResult, UpdateInfo} from '@shared/info-objects/update-info';
import {autoUpdater, UpdateCheckResult as ElectronUpdateCheckResult} from 'electron-updater';
import {isNil} from 'lodash';
import logger from 'electron-log';
const LOG = logger.scope('UpdateHandler');

let latestUpdate: ElectronUpdateCheckResult = null;
let updateDownloaded = false;
let installScheduled = false;

export function checkForUpdates(): Promise<UpdateCheckResult | null> {
  LOG.debug('Checking for updates...');
  if (!autoUpdater.isUpdaterActive()) {
    LOG.debug('AutoUpdater is not active');
    return Promise.resolve(null);
  }
  return autoUpdater.checkForUpdates().then((update) => {
    if (isNil(update.cancellationToken)) {
      LOG.debug('Available update is not newer');
      return Promise.resolve(null);
    }
    latestUpdate = update;
    const canSkip = autoUpdater.allowPrerelease;
    LOG.debug('Latest update: ' + JSON.stringify(latestUpdate));
    LOG.debug('Can skip: ' + JSON.stringify(canSkip));
    return {
      updateInfo : update.updateInfo,
      canSkip // Only if pre-releases are enabled can it be skipped
    };
  });
}

export function downloadUpdate(): Promise<UpdateInfo> {
  if (isNil(latestUpdate) || isNil(latestUpdate.cancellationToken)) {
    LOG.debug('No update to download');
    return Promise.reject('No update available');
  }
  LOG.debug('Downloading update...');
  return autoUpdater.downloadUpdate(latestUpdate.cancellationToken).then(() => {
    LOG.debug('Downloaded update!');
    updateDownloaded = true;
    return latestUpdate.updateInfo;
  }, (reason) => {
    LOG.error('Error trying to download update: ' + JSON.stringify(reason));
    return Promise.reject(reason);
  });
}

/**
 * Returns true if there is an downloaded update ready to be installed
 */
export function isUpdateReady(): boolean {
  return updateDownloaded && installScheduled;
}

export function scheduleInstall(): void {
  LOG.debug('Update schedule to install on exit');
  installScheduled = true;
}
