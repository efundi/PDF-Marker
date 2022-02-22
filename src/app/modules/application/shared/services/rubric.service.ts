import {Injectable} from '@angular/core';
import {RubricServiceIpc} from '../../../../../shared/ipc/rubric-service-ipc';
import {Observable} from 'rxjs';
import {IRubric, IRubricName, SelectedRubric} from '../../../../../shared/info-objects/rubric.class';
import {fromIpcResponse} from '@sharedModule/services/ipc.utils';

@Injectable({
  providedIn: 'root'
})
export class RubricService {

  private rubricApi: RubricServiceIpc;

  constructor() {
    this.rubricApi = (window as any).rubricApi;
  }

  selectRubricFile(): Observable<SelectedRubric> {
     return fromIpcResponse(this.rubricApi.selectRubricFile());
  }

  uploadRubric(rubric: IRubric): Observable<IRubricName[]> {
     return fromIpcResponse(this.rubricApi.rubricUpload(rubric));
  }

  getRubricNames(): Observable<IRubricName[]> {
    return fromIpcResponse(this.rubricApi.getRubricNames());
  }

  getRubrics(): Observable<IRubric[]> {
    return fromIpcResponse(this.rubricApi.getRubrics());
  }

  deleteRubricCheck(rubricName: string): Observable<boolean> {
    return fromIpcResponse(this.rubricApi.deleteRubricCheck(rubricName));
  }

  deleteRubric(rubricName: string): Observable<IRubricName[]> {
    return fromIpcResponse(this.rubricApi.deleteRubric(rubricName));
  }

  getRubric(rubricName: string): Observable<IRubric> {
    return fromIpcResponse(this.rubricApi.getRubric(rubricName));
  }
}
