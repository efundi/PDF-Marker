import {IpcResponse} from './ipc-response';
import {UpdateCheckResult, UpdateInfo} from '@shared/info-objects/update-info';

export interface UpdateIpcService {
  checkForUpdate(): Promise<IpcResponse<UpdateCheckResult | null>>;
  downloadUpdate(): Promise<IpcResponse<UpdateInfo>>;
  restartApplication(): void;
  scheduleInstall(): void;
}
