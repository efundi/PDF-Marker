import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {ActivatedRoute, Router} from '@angular/router';
import {AppService} from '../../services/app.service';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {MatDialogConfig} from '@angular/material/dialog';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {
  AssignmentWorkspaceManageModalComponent
} from '../assignment-workspace-manage-modal/assignment-workspace-manage-modal.component';
import {Observable, Subscription, tap, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {BusyService} from '../../services/busy.service';
import {TreeNodeType, WorkspaceTreeNode} from '@shared/info-objects/workspaceTreeNode';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {RoutesEnum} from '../../utils/routes.enum';
import {isNil, reduce} from 'lodash';
import {MARK_FILE} from '@shared/constants/constants';
import {MatSort, MatSortable} from '@angular/material/sort';
import {WorkspaceService} from '../../services/workspace.service';

export interface WorkspaceDetails {
  assignmentTitle: string;

  submissionCount: number;

  marked?: number;

  type: string;

  currentWorkspace: string;

}

@Component({
  selector: 'pdf-marker-workspace-assignment-overview',
  templateUrl: './assignment-workspace-overview.component.html',
  styleUrls: ['./assignment-workspace-overview.component.scss']
})
export class AssignmentWorkspaceOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  displayedColumns: string[] = ['assignmentTitle', 'submissionCount', 'progress', 'type'];
  dataSource = new MatTableDataSource([]);
  workspaceRows: WorkspaceDetails[] = [];
  workspaceName = 'Workspace Name';
  assignmentsLength;
  private workspace: WorkspaceTreeNode;
  private sortSubscription: Subscription;
  subscription: Subscription;

  @ViewChild(MatPaginator, {static: true})
  paginator: MatPaginator;

  @ViewChild(MatSort, {static: true})
  sort: MatSort;

  isSettings: boolean;
  isCreated: boolean;

  constructor(private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService,
              private router: Router,
              private appService: AppService,
              private busyService: BusyService,
              private activatedRoute: ActivatedRoute) {
  }

  ngOnInit() {
    this.subscription = this.activatedRoute.params.subscribe({
      next: (params) => {
        this.busyService.start();
        const workspaceName = params['workspaceName'];
        this.workspaceService.getWorkspaceHierarchy(workspaceName).subscribe((workspace) => {
          this.workspace = workspace;
          this.generateDataFromModel();
          this.busyService.stop();
        });
      },
      error: (error) => {
        console.log(error);
        this.appService.openSnackBar(false, 'Unable to read selected workspace');
        this.busyService.stop();
      }
    });
  }

  manageFolders() {
    const config = new MatDialogConfig();
    config.disableClose = true;
    config.width = '400px';
    config.data = {
      workspaceName: this.workspaceName,
      assignments: this.dataSource.data,
      workspace: this.workspace
    };


    const dialogRef = this.appService.createDialog(AssignmentWorkspaceManageModalComponent, config);

    dialogRef.afterClosed().subscribe(result => {
      let edited = false;
      if (result && result.workspaceName && result.workspaceName !== this.workspaceName) {
        this.workspaceName = result.workspaceName;
        edited = true;
      }
      if (result && result.movedAssignments && result.movedAssignments.length > 0) {
        this.dataSource.data = this.workspaceRows;
        edited = true;
      }
      if (edited) {
        this.busyService.start();
        this.workspaceService.refreshWorkspaces().subscribe({
          next: () => {
            this.busyService.stop();
            this.appService.openSnackBar(true, 'Refreshed list');
          },
          error: () => {
            this.busyService.stop();
          }
        });
      }
    });
  }

  getAssignmentSettings(assignmentName: string): Observable<AssignmentSettingsInfo> {
    this.busyService.start();
    return this.assignmentService.getAssignmentSettings(this.workspaceName, assignmentName).pipe(
      tap((assignmentSettings) => {
        this.busyService.stop();
        return assignmentSettings;
      }), catchError((error) => {
        this.busyService.stop();
        return throwError(error);
      })
    );
  }

  private generateDataFromModel() {
    // let workspaceRows: WorkspaceDetails[] = [];
    this.workspaceRows = [];
    this.workspaceName = this.workspace.name;
    this.workspace.children.forEach(workspaceAssignment => {
      const workspaceRow: WorkspaceDetails = {
        assignmentTitle: '',
        submissionCount: 0,
        marked: 0,
        type: '',
        currentWorkspace: ''
      };
      // Assignment Name
      workspaceRow.assignmentTitle = workspaceAssignment.name;
      // Submissions Count
      const assignmentFiles = workspaceAssignment.children.filter(c => c.type === TreeNodeType.SUBMISSION);
      workspaceRow.submissionCount = assignmentFiles.length;
      workspaceRow.marked = reduce(assignmentFiles, (sum, value) => {
        // There will only be 1 or zero mark files
        const marked =  value.children.filter(c => c.type === TreeNodeType.FILE && c.name === MARK_FILE).length;
        return sum + marked;
      }, 0);

      // Type TODO here is an async issue, these calls will still be busy when already added to the workspaceRows array
      this.getAssignmentSettings(workspaceAssignment.name).subscribe({
        next: (assignmentSettings) => {
          workspaceRow.type = assignmentSettings.rubric ? 'Rubric' : 'Manual';
        },
        error: (error) => {
          workspaceRow.type = 'Unknown';
          console.error('Unable to load assignment settings for \'' + workspaceAssignment.name + '\'. This directory should probably be removed');
        }
      });
      workspaceRow.currentWorkspace =  this.workspaceName;
      this.workspaceRows.push(workspaceRow);
    });
    this.dataSource.data = this.workspaceRows;
    this.assignmentsLength = this.workspaceRows.length;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.sortSubscription.unsubscribe();
  }

  openAssignmentOverview(element: WorkspaceDetails) {
    if (PdfmUtilsService.isDefaultWorkspace(element.currentWorkspace)) {
      this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, element.assignmentTitle]);
    } else {
      this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, element.assignmentTitle, element.currentWorkspace]);
    }

  }

  ngAfterViewInit() {
    this.sortSubscription = this.sort.sortChange.subscribe((change) => {
      localStorage.setItem('workspace-overview-sort', JSON.stringify({
        id: change.active,
        start: change.direction
      }));
    });

    const value = localStorage.getItem('workspace-overview-sort');
    let sort: MatSortable = {id: 'assignmentTitle', start: 'asc'} as MatSortable;
    if (!isNil(value)) {
      try {
        sort = JSON.parse(value);
      } catch (e) {}
    }
    this.sort.sort(sort);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }
}
