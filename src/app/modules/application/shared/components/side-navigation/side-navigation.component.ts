import { Component, OnInit } from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {AppService} from "@coreModule/services/app.service";
import {RoutesEnum} from "@coreModule/utils/routes.enum";
import {Router} from "@angular/router";
import {ZipService} from "@coreModule/services/zip.service";

@Component({
  selector: 'pdf-marker-side-navigation',
  templateUrl: './side-navigation.component.html',
  styleUrls: ['./side-navigation.component.scss']
})
export class SideNavigationComponent implements OnInit {

  constructor(private assignmentService: AssignmentService,
              private appService: AppService,
              private router: Router,
              private zipService: ZipService) { }

  ngOnInit() {
  }

  onRefresh(event) {
    this.appService.isLoading$.next(true);
    this.assignmentService.getAssignments().subscribe((assignments) => {
      this.assignmentService.update(assignments);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, "Refreshed list");
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Could not refresh list");
    });
  }

  goHome() {
    this.router.navigate([RoutesEnum.MARKER]);
  }
}
