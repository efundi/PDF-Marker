import {Injectable} from '@angular/core';
import {ConvertIpcService} from '@shared/ipc/convert.ipc-service';
import {first, map, mergeMap, Observable, tap} from 'rxjs';
import {fromIpcResponse} from './ipc.utils';
import {findTreeNode, WorkspaceFile} from '@shared/info-objects/workspace';
import {PdfmUtilsService} from './pdfm-utils.service';
import {WorkspaceService} from './workspace.service';

@Injectable({
  providedIn: 'root'
})
export class ConvertService {

  private convertApi: ConvertIpcService;

  constructor(private workspaceService: WorkspaceService) {

    this.convertApi = (window as any).convertApi;
  }


  private renameConvertedSubmissionFile(workspace: string, oldSubmissionFile: string, newSubmissionFile: string): Observable<any>{
    return this.workspaceService.workspaceList.pipe(
      first(),
      tap((workspaces) => {

        if (!oldSubmissionFile.startsWith(workspace)) {
          oldSubmissionFile = workspace + '/' + oldSubmissionFile;
        }
        const submissionFile: WorkspaceFile = findTreeNode(oldSubmissionFile, workspaces) as WorkspaceFile;
        submissionFile.name = PdfmUtilsService.basename(newSubmissionFile);
      })
    );
  }

  convertToPdf(workspaceName: string, assignmentName: string, filePath: string): Observable<string> {
    return fromIpcResponse(this.convertApi.convertToPdf(workspaceName, assignmentName, filePath))
      .pipe(
        mergeMap((response) => {
          // After saving the marks we need to update the workspace list to contain the new modified date
          return this.renameConvertedSubmissionFile(workspaceName, filePath, response)
            .pipe(
              mergeMap(() => this.workspaceService.refreshWorkspaces()),
              map(() => response)
            );
        }),
      );
  }

  libreOfficeFind(): Observable<string> {
    return fromIpcResponse(this.convertApi.libreOfficeFind());
  }

  libreOfficeVersion(path: string): Observable<string> {
    return fromIpcResponse(this.convertApi.libreOfficeVersion(path));
  }
}
