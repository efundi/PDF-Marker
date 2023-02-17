import {IpcResponse} from './ipc-response';
import {AppVersionInfo} from '../info-objects/app-version.info';
import {AppSelectedPathInfo} from '../info-objects/app-selected-path.info';
import {OpenFileInfo, SaveFileInfo} from '../info-objects/file-filter.info';

export interface ApplicationIpcService {

  getAppVersion(): Promise<IpcResponse<AppVersionInfo>>;
  getFolder(): Promise<IpcResponse<AppSelectedPathInfo>>;
  getFile(fileFilter: OpenFileInfo): Promise<IpcResponse<AppSelectedPathInfo>>;
  saveFile(fileFilter: SaveFileInfo): Promise<IpcResponse<AppSelectedPathInfo>>;
  openExternalLink(url: string): Promise<IpcResponse<any>>;
}
