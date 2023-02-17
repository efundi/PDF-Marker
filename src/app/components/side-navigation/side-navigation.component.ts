import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AppService} from '../../services/app.service';
import {BusyService} from '../../services/busy.service';
import {Subscription} from 'rxjs';
import {AssignmentListComponent} from '../assignment-list/assignment-list.component';
import {WorkspaceService} from '../../services/workspace.service';

@Component({
  selector: 'pdf-marker-side-navigation',
  templateUrl: './side-navigation.component.html',
  styleUrls: ['./side-navigation.component.scss']
})
export class SideNavigationComponent implements OnInit, OnDestroy {

  loadingWorkspaces = false;
  private loadingWorkspacesSubscription: Subscription;

  @ViewChild(AssignmentListComponent)
  private assignmentListComponent: AssignmentListComponent;

  constructor(private workspaceService: WorkspaceService,
              private appService: AppService,
              private busyService: BusyService) { }

  ngOnInit() {
    this.loadingWorkspacesSubscription = this.workspaceService.workspaceListLoading.subscribe((loading) => {
      this.loadingWorkspaces = loading;
    });
  }

  ngOnDestroy() {
    this.loadingWorkspacesSubscription.unsubscribe();
  }

  onRefresh(event) {
    this.busyService.start();
    this.workspaceService.refreshWorkspaces().subscribe((assignments) => {
      this.busyService.stop();
      this.appService.openSnackBar(true, 'Refreshed list');
    }, () => {
      this.busyService.stop();
    });
  }

  collapseAll($event: MouseEvent) {
    this.assignmentListComponent.collapseAll();
  }
}
