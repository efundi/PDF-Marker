import {Injectable} from '@angular/core';
import {ImportInfo} from '@shared/info-objects/import.info';
import {fromIpcResponse} from './ipc.utils';
import {ImportIpcService} from '@shared/ipc/import.ipc-service';
import {map, mergeMap, Observable} from 'rxjs';
import {TreeNode} from '@shared/info-objects/workspaceTreeNode';
import {AssignmentValidateResultInfo} from '@shared/info-objects/assignment-validate-result.info';
import {LectureImportInfo} from '@shared/info-objects/lecture-import.info';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {WorkspaceService} from './workspace.service';

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  private importService: ImportIpcService;

  constructor(private workspaceService: WorkspaceService) {
    this.importService = (window as any).importApi;
  }

  importAssignmentFile(data: ImportInfo): Observable<string> {
    return fromIpcResponse(this.importService.importZip(data))
      .pipe(
        mergeMap((response) => {
          return this.workspaceService.refreshWorkspaces()
            .pipe(
              map(() => response)
            );
        })
      );
  }

  validateZipFile(filePath: string, format: string): Observable<AssignmentValidateResultInfo> {
    return fromIpcResponse(this.importService.validateZipFile(filePath, format));
  }

  getZipEntries(filePath: string): Observable<TreeNode[]> {
    return fromIpcResponse(this.importService.getZipEntries(filePath));
  }

  validateLectureImport(importInfo: LectureImportInfo): Observable<any> {
    return fromIpcResponse(this.importService.validateLectureImport(importInfo));
  }

  lectureImport(importInfo: LectureImportInfo): Observable<AssignmentSettingsInfo> {
    return fromIpcResponse(this.importService.lectureImport(importInfo));
  }


}
