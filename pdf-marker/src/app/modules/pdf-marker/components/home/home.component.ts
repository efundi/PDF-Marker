import {Component, OnDestroy, OnInit} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";

@Component({
  selector: 'pdf-marker-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [AssignmentService]
})
export class HomeComponent implements OnInit, OnDestroy {

  constructor(private assignmentService: AssignmentService) { }

  ngOnInit() {
  }

  ngOnDestroy(): void {
  }

}
