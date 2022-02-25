import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {SakaiService} from '../../services/sakai.service';
import {ActivatedRoute, Router} from '@angular/router';
import {AppService} from '../../services/app.service';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {AlertService} from '../../services/alert.service';
import {SettingsService} from '../../services/settings.service';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {FormBuilder} from '@angular/forms';
// import * as fs from 'fs';
// import * as path from 'path';
// import {sep} from 'path';
import {AssignmentWorkspaceManageModalComponent} from '../assignment-workspace-manage-modal/assignment-workspace-manage-modal.component';
import {firstValueFrom, Observable, Subscription, tap, throwError} from 'rxjs';
import {catchError} from "rxjs/operators";

export interface WorkspaceDetails {
  assignmentTitle: string;

  submissionCount: number;

  marked?: number;

  notMarked?: number;

  type: string;

  currentWorkspace: string;

}

@Component({
  selector: 'pdf-marker-workspace-assignment-overview',
  templateUrl: './assignment-workspace-overview.component.html',
  styleUrls: ['./assignment-workspace-overview.component.scss']
})
export class AssignmentWorkspaceOverviewComponent implements OnInit, OnDestroy {
  private hierarchyModel;
  displayedColumns: string[] = ['assignmentTitle', 'submissionCount', 'progress', 'type'];
  dataSource: MatTableDataSource<WorkspaceDetails>;
  workspaceRows: WorkspaceDetails[] = [];
  workspaceName = 'Workspace Name';
  private assignmentGrades: any[] = [];
  assignmentsLength;
  assignmentPageSizeOptions: number[];
  readonly pageSize: number = 10;
  private assignmentsInFolder: any[] = [];
  private assignmentHeader: string;
  subscription: Subscription;

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  isSettings: boolean;
  isCreated: boolean;

  constructor(private assignmentService: AssignmentService,
              private sakaiService: SakaiService,
              private router: Router,
              private appService: AppService,
              private activatedRoute: ActivatedRoute) {
  }

  ngOnInit() {
    this.initForm();
    this.subscription = this.activatedRoute.params.subscribe((params) => {
      const workspaceName = params['workspaceName'];
      this.hierarchyModel = this.assignmentService.getWorkspaceHierarchy(workspaceName);
      return this.generateDataFromModel();
    }, error => {
      console.log(error);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, 'Unable to read selected workspace');
    });
    // this.appService.isLoading$.next(false);
  }

  private initForm() {
  }

  manageFolders(event) {
    const config = new MatDialogConfig();
    config.disableClose = true;
    config.width = '400px';
    config.height = '500px';
    config.data = {
      workspaceName: this.workspaceName,
      assignments: this.dataSource.data,
      hierarchyModel: this.hierarchyModel
    };


    const dialogRef = this.appService.createDialog(AssignmentWorkspaceManageModalComponent, config);

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);
      let edited = false;
      if (result && result.workspaceName && result.workspaceName !== this.workspaceName) {
        this.workspaceName = result.workspaceName;
        edited = true;
      }
      if (result && result.movedAssignments && result.movedAssignments.length > 0) {
        this.dataSource = new MatTableDataSource<WorkspaceDetails>(this.workspaceRows);
        edited = true;
      }
      if (edited) {
        this.appService.isLoading$.next(true);
        this.assignmentService.getAssignments().subscribe((assignments) => {
          this.assignmentService.update(assignments);
          this.appService.isLoading$.next(false);
          this.appService.openSnackBar(true, 'Refreshed list');
        }, error => {
          this.appService.isLoading$.next(false);
          this.appService.openSnackBar(false, 'Could not refresh list');
        });

      }
    });
  }

  getAssignmentSettings(assignmentName: string): Observable<AssignmentSettingsInfo> {
    this.appService.isLoading$.next(true);
    return this.assignmentService.getAssignmentSettings(this.workspaceName, assignmentName).pipe(
      tap((assignmentSettings) => {
        // this.assignmentService.setSelectedAssignment(updateAssignmentSettings);
        this.appService.isLoading$.next(false);
        return assignmentSettings;
      }), catchError((error) => {
        this.appService.isLoading$.next(false);
        return throwError(error);
      })
    );
  }

  private generateDataFromModel() {
    // let workspaceRows: WorkspaceDetails[] = [];
    this.workspaceRows = [];
    this.workspaceName = (Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0] : '';
    if (this.hierarchyModel[this.workspaceName]) {
      Object.keys(this.hierarchyModel[this.workspaceName]).forEach(assignmentName => {
        if (assignmentName) {
          const workspaceRow: WorkspaceDetails = {
            assignmentTitle: '',
            submissionCount: 0,
            marked: 0,
            notMarked: 0,
            type: '',
            currentWorkspace: ''
          };
          // Assignment Name
          workspaceRow.assignmentTitle = assignmentName;
          // Submissions Count
          const assignmentFiles = Object.keys(this.hierarchyModel[this.workspaceName][assignmentName])
            .filter(x => this.sakaiService.getAssignmentRootFiles().indexOf(x) === -1);
          workspaceRow.submissionCount = assignmentFiles.length;
          // Marked/Not Marked
          this.assignmentService.getMarkedAssignmentsCount(this.workspaceName , assignmentName).subscribe((count) => {
            workspaceRow.marked = count;
            workspaceRow.notMarked = workspaceRow.submissionCount - workspaceRow.marked;
          });
          // Type TODO here is an async issue, these calls will still be busy when already added to the workspaceRows array
          this.getAssignmentSettings(assignmentName).subscribe((assignmentSettings) => {
            workspaceRow.type = assignmentSettings.rubric ? 'Rubric' : 'Manual';

          });
          workspaceRow.currentWorkspace =  this.workspaceName;
          this.workspaceRows.push(workspaceRow);
        }
      });
      this.dataSource = new MatTableDataSource(this.workspaceRows);
      this.dataSource.paginator = this.paginator;
      this.assignmentsLength = this.workspaceRows.length;
      const range = [];
      let i = 0;
      while (i <= this.assignmentsLength) {
        i += this.pageSize;
        range.push(i);

        if (i > this.assignmentsLength) {
          break;
        }
      }
      this.assignmentPageSizeOptions = range;
      this.appService.isLoading$.next(false);
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
