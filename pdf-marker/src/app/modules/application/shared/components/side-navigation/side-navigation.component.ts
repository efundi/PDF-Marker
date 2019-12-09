import { Component, OnInit } from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";

@Component({
  selector: 'pdf-marker-side-navigation',
  templateUrl: './side-navigation.component.html',
  styleUrls: ['./side-navigation.component.scss']
})
export class SideNavigationComponent implements OnInit {

  constructor(private assignmentService: AssignmentService) { }

  ngOnInit() {
  }

  onRefresh(event) {
    this.assignmentService.getAssignments().subscribe((assignments) => {
      this.assignmentService.update(assignments);
    });
  }

}
