import {Component, OnInit} from '@angular/core';
import {RoutesEnum} from "@coreModule/utils/routes.enum";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {Subscription} from "rxjs";
import {AppService} from "@coreModule/services/app.service";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";

@Component({
  selector: 'pdf-marker-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  readonly settings: string = "Settings";
  readonly editAssignment: string = "editAssignment";

  readonly toolbarMenu = [
    { title: "Import", toolTip: "Import Zip from default LMS", icon: "archive", href: RoutesEnum.ASSIGNMENT_IMPORT },
    { title: "Upload", toolTip: "Upload PDF file(s)", icon: "picture_as_pdf", href: RoutesEnum.ASSIGNMENT_UPLOAD },
    { title: "Settings", toolTip: "Settings", icon: "settings"},
  ];

  readonly menuItems = [
    { id: "settings", title: "App Settings", icon: "build", href: RoutesEnum.ASSIGNMENT_SETTINGS },
    { id: "rubrics",  title: "Rubrics", icon: "apps", href: RoutesEnum.ASSIGNMENT_RUBRICS },
    { id: "editAssignment", title: "Add/remove Student Submissions", icon: "exposure", href: RoutesEnum.ASSIGNMENT_UPLOAD },
  ];

  private subscription: Subscription;
  private hierarchyModel: object;
  private assignmentSettings: AssignmentSettingsInfo;
  assignmentName: string;
  isCreated: boolean;
  constructor(private assignmentService: AssignmentService,
              private appService: AppService) { }

  ngOnInit() {
    this.subscription = this.assignmentService.selectedAssignmentChanged().subscribe((hierarchyModel) => {
      if(hierarchyModel !== null) {
        this.hierarchyModel = hierarchyModel;
        this.assignmentName = (Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0] : '';
        this.getAssignmentSettings(this.assignmentName);
      } else {
        this.isCreated = false;
      }
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to read selected assignment");
    });
  }

  private getAssignmentSettings(assignmentName: string) {
    this.assignmentService.getAssignmentSettings(assignmentName).subscribe((assignmentSettings: AssignmentSettingsInfo) => {
      this.assignmentSettings = assignmentSettings;
      this.isCreated = this.assignmentSettings.isCreated;
    }, error => {
      this.appService.openSnackBar(false, "Unable to read assignment settings");
      this.appService.isLoading$.next(false);
    });
  }
}
