import {Component, OnDestroy, OnInit} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {Subscription} from 'rxjs';
import {WorkspaceService} from '../../services/workspace.service';

@Component({
  selector: 'pdf-marker-assignment-list',
  templateUrl: './assignment-list.component.html',
  styleUrls: ['./assignment-list.component.scss']
})
export class AssignmentListComponent implements OnInit, OnDestroy {


  assignments: object[];
  private assignmentSubscription: Subscription;
  private workspaceSubscription: Subscription;
  workspaces: any;
  workspaceBool = false;
  constructor(private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService) { }

  ngOnInit() {

    // this.workspaces = this.workspaceService.getWorkspaces();
    this.workspaceSubscription = this.workspaceService.getWorkspaces().subscribe((workspaces: string[]) => {
       this.workspaces = workspaces;
    });
    this.assignmentSubscription = this.assignmentService.dataChanged().subscribe(assignments => {
      this.assignments = assignments;
    });

}

  ngOnDestroy() {
    this.workspaceSubscription.unsubscribe();
    this.assignmentSubscription.unsubscribe();
  }

}
