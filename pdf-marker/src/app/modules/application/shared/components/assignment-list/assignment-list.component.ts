import {Component, OnDestroy, OnInit} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {Subscription} from "rxjs";

@Component({
  selector: 'pdf-marker-assignment-list',
  templateUrl: './assignment-list.component.html',
  styleUrls: ['./assignment-list.component.scss']
})
export class AssignmentListComponent implements OnInit, OnDestroy {

  assignments: object[];
  subscription: Subscription;
  constructor(private assignmentService: AssignmentService) { }

  ngOnInit() {
    this.subscription = this.assignmentService.dataChanged().subscribe(assignments => {
      this.assignments = assignments;
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}
