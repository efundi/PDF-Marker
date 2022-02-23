import {IRubric, IRubricName, SelectedRubric} from '../info-objects/rubric.class';
import {IpcResponse} from './ipc-response';

export interface RubricIpcService {
  getRubricNames(): Promise<IpcResponse<IRubricName[]>>;
  rubricUpload(rubric: IRubric): Promise<IpcResponse<IRubricName[]>>;
  selectRubricFile(): Promise<IpcResponse<SelectedRubric>>;
  deleteRubricCheck(rubricName: string): Promise<IpcResponse<boolean>>;
  deleteRubric(rubricName: string): Promise<IpcResponse<IRubricName[]>>;
  getRubric(rubricName: string): Promise<IpcResponse<IRubric>>;
  getRubrics(): Promise<IpcResponse<IRubric[]>>;
}
