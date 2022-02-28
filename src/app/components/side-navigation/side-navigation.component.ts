import {Component, OnInit} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {AppService} from '../../services/app.service';
import {BusyService} from '../../services/busy.service';

@Component({
  selector: 'pdf-marker-side-navigation',
  templateUrl: './side-navigation.component.html',
  styleUrls: ['./side-navigation.component.scss']
})
export class SideNavigationComponent implements OnInit {

  constructor(private assignmentService: AssignmentService,
              private appService: AppService,
              private busyService: BusyService) { }

  ngOnInit() {
  }

  onRefresh(event) {
    this.busyService.start();
    this.assignmentService.getAssignments().subscribe((assignments) => {
      this.assignmentService.update(assignments);
      this.busyService.stop();
      this.appService.openSnackBar(true, 'Refreshed list');
    }, error => {
      this.busyService.stop();
      this.appService.openSnackBar(false, 'Could not refresh list');
    });
  }
}
