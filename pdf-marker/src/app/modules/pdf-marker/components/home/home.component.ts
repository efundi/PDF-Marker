import {Component, OnDestroy, OnInit} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {Subscription} from "rxjs";

@Component({
  selector: 'pdf-marker-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [AssignmentService]
})
export class HomeComponent implements OnInit, OnDestroy {

  subscription: Subscription;
  constructor(private assignmentService: AssignmentService) { }

  ngOnInit() {
    this.subscription = this.assignmentService.dataChanged().subscribe(assingments => {
      console.log("Home", assingments);
    })
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
