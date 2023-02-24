import { Injectable } from '@angular/core';
import {Workspace, WorkspaceAssignment, WorkspaceFile} from '@shared/info-objects/workspace';
import {map, mergeMap, Observable, of, tap, throwError} from 'rxjs';
import {PdfmUtilsService} from './pdfm-utils.service';
import {AssignmentService} from './assignment.service';
import {BusyService} from './busy.service';
import {AppService} from './app.service';
import {ConvertService} from './convert.service';
import {calculateOpenInMarking} from '../utils/utils';
import {RoutesEnum} from '../utils/routes.enum';
import {Router} from '@angular/router';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {catchError} from 'rxjs/operators';
import {SettingsService} from './settings.service';
import {isNil} from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class SubmissionNavigationService {

  constructor(private assignmentService: AssignmentService,
              private appService: AppService,
              private busyService: BusyService,
              private convertService: ConvertService,
              private settingsService: SettingsService,
              private router: Router) { }


  private convertFile(submissionFile: WorkspaceFile): Observable<WorkspaceFile> {
    const assignment = submissionFile.parent.parent.parent as WorkspaceAssignment;
    const workspace = assignment.parent as Workspace;
    const submissionFilePath = PdfmUtilsService.buildTreePath(submissionFile);
    this.busyService.start();

    return this.settingsService.getConfigurations()
      .pipe(
        mergeMap((config) => {
          if (isNil(config.libreOfficePath)) {
            return throwError(() => 'Please configure Libre Office path');
          }
          return this.convertService.libreOfficeVersion(config.libreOfficePath);
        }),
        mergeMap((libreOfficeVersion) => {
          if (isNil(libreOfficeVersion)) { // We could use this to validate a specific version we require
            return throwError(() => 'Could not determine libre office version');
          }

          this.appService.openSnackBar(true, 'Converting to PDF...');
          return this.convertService.convertToPdf(workspace.name, assignment.name, submissionFilePath);
        }),
        catchError((error) => {
          this.appService.openSnackBar(false, error);
          this.busyService.stop();
          return throwError(() => error);
        }),
        map((filename) => {
          this.busyService.stop();
          submissionFile.name = PdfmUtilsService.basename(filename); // TODO hacking
          return submissionFile;
        })
      );
  }

  openSubmission(submissionFile: WorkspaceFile): Observable<any> {
    const assignment = submissionFile.parent.parent.parent as WorkspaceAssignment;
    const workspace = assignment.parent as Workspace;

    let assignmentSettings: AssignmentSettingsInfo;
   return this.assignmentService.getAssignmentSettings(workspace.name, assignment.name)
      .pipe(
        tap(settings => assignmentSettings = settings),
        mergeMap(() => {
          if (submissionFile.name.endsWith('.pdf')) {
            return of(submissionFile);
          } else {
            return this.convertFile(submissionFile);
          }
        }),
        tap((submissionWorkspaceFile: WorkspaceFile) => {
          const pdfPath = PdfmUtilsService.buildTreePath(submissionWorkspaceFile);
          this.assignmentService.selectSubmission({
            workspace,
            assignment,
            pdfFile: submissionWorkspaceFile
          });
          const route = calculateOpenInMarking(assignmentSettings) ? RoutesEnum.ASSIGNMENT_MARKER : RoutesEnum.PDF_VIEWER;
          this.router.navigate([
            route,
            workspace.name,
            assignment.name,
            pdfPath
          ]);
        })
      );
  }
}
