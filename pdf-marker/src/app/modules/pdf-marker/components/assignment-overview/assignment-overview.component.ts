import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {SakaiService} from "@coreModule/services/sakai.service";
import {Router} from "@angular/router";
import {Subscription} from "rxjs";
import {AppService} from "@coreModule/services/app.service";
import {MatPaginator} from "@angular/material/paginator";
import {MatTableDataSource} from "@angular/material/table";
import {MatDialogConfig} from "@angular/material/dialog";
import {YesAndNoConfirmationDialogComponent} from "@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component";
import {AlertService} from "@coreModule/services/alert.service";
import {HttpEventType} from "@angular/common/http";
import {FileSaverService} from "ngx-filesaver";
import {SettingsService} from "@pdfMarkerModule/services/settings.service";
import {SettingInfo} from "@pdfMarkerModule/info-objects/setting.info";

export interface AssignmentDetails {
  studentName: string;

  studentNumber: string;

  assignment: string

  grade: number;

  path: string;

  status: string;
};

@Component({
  selector: 'pdf-marker-assignment-overview',
  templateUrl: './assignment-overview.component.html',
  styleUrls: ['./assignment-overview.component.scss']
})
export class AssignmentOverviewComponent implements OnInit, OnDestroy {
  private hierarchyModel;
  displayedColumns: string[] = ['studentName', 'assignment', 'grade', 'status'];
  dataSource: MatTableDataSource<AssignmentDetails>;
  assignmentName: string = 'Assignment Name';
  assignmentsLength;
  assignmentPageSizeOptions: number[];
  readonly pageSize: number = 10;
  private assignmentGrades: any[] = [];
  private assignmentHeader: string;
  private readonly submissionFolder = "Submission attachment(s)";

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  readonly regEx = /(.*)\((.+)\)/;
  private subscription: Subscription;
  private settings: SettingInfo;
  isSettings: boolean;
  constructor(private assignmentService: AssignmentService,
              private sakaiService: SakaiService,
              private router: Router,
              private appService: AppService,
              private alertService: AlertService,
              private fileSaverService: FileSaverService,
              private settingsService: SettingsService) { }

  ngOnInit() {
    this.subscription = this.assignmentService.selectedAssignmentChanged().subscribe((selectedAssignment) => {
      this.hierarchyModel = selectedAssignment;
      this.getGrades();
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to read selected assignment");
    });

    this.settingsService.getConfigurations().subscribe((configurations: SettingInfo) => {
      if(configurations.defaultPath && configurations.lmsSelection) {
        this.settings = configurations;
        this.isSettings = true;
        if(!this.hierarchyModel && !!this.assignmentService.getSelectedAssignment()) {
          this.hierarchyModel = this.assignmentService.getSelectedAssignment();
          this.getGrades();
        } else {
          this.router.navigate(["/marker"])
        }
      }
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.isLoading$.next(false);
    });
  }

  private getGrades() {
    this.assignmentService.getAssignmentGrades().subscribe((grades: any[]) => {
      this.assignmentGrades = grades;
      if(this.assignmentGrades.length > 0) {
        const keys = Object.keys(grades[0]);
        if(keys.length > 0) {
          this.assignmentHeader = keys[0];
            this.generateDataFromModel();
        }
      }
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to read assignment grades file");
    })
  }

  private generateDataFromModel() {
    let values: AssignmentDetails[] = [];
    this.assignmentName = (Object.keys(this.hierarchyModel).length) ? Object.keys(this.hierarchyModel)[0]:'';
    Object.keys(this.hierarchyModel[this.assignmentName]).forEach(key => {
      if(this.sakaiService.getassignmentRootFiles().indexOf(key) === -1) {
        let value: AssignmentDetails = {
          studentName: '',
          studentNumber: '',
          assignment: '',
          grade: 0,
          path: null,
          status: ''
        };
        const matches = this.regEx.exec(key);
        value.studentName = matches[1];
        value.studentNumber = matches[2];
        value.assignment = this.hierarchyModel[this.assignmentName][key][this.submissionFolder] ? Object.keys(this.hierarchyModel[this.assignmentName][key][this.submissionFolder])[0]:'';
        const gradesInfo = this.assignmentGrades.find(gradesInfo => gradesInfo[this.assignmentHeader] === value.studentNumber);
        value.grade = ((gradesInfo && gradesInfo.field5) ? gradesInfo.field5:0);
        value.path = (value.assignment) ? this.assignmentName + '/' + key + "/" + this.submissionFolder + "/" + value.assignment:'';
        value.status = ((gradesInfo && gradesInfo.field7) ? gradesInfo.field7:'N/A');
        values.push(value);
      }
    });
    this.dataSource = new MatTableDataSource(values);
    this.dataSource.paginator = this.paginator;
    this.assignmentsLength = values.length;
    const range = [];
    let i = 0;
    while(i <= this.assignmentsLength) {
        i += this.pageSize;
        range.push(i);

      if(i > this.assignmentsLength)
        break;
    }
    this.assignmentPageSizeOptions = range;
    this.appService.isLoading$.next(false);
  }

  onSelectedPdf(pdfFileLocation: string) {
    this.appService.isLoading$.next(true);
    this.assignmentService.getFile(pdfFileLocation).subscribe(blobData => {
      const blob = new Blob([blobData], { type: "application/pdf"});
      const fileUrl = URL.createObjectURL(blob);

      this.assignmentService.setSelectedPdfURL(fileUrl, pdfFileLocation);
      this.assignmentService.setSelectedPdfBlob(blob);
      if(this.router.url !== "/marker/assignment/marking")
        this.router.navigate(["/marker/assignment/marking"]);
    }, error => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(false, "Unable to open file")
    })
  }

  onFinalizeAndExport(event) {
    if(!this.isSettings) {
      event.target.disabled = true;
      return;
    }
    this.openYesNoConfirmationDialog(null, "Are you sure you want to finalise and zip this assignment?");
  }

  private openYesNoConfirmationDialog(title: string = "Confirm", message: string) {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "400px";
    config.data = {
      title: title,
      message: message,
    };

    const shouldFinalizeAndExportFn = (shouldFinalizeAndExport: boolean) => {
      if(shouldFinalizeAndExport) {
        this.appService.isLoading$.next(true);
        this.assignmentService.finalizeAndExport(this.assignmentName).subscribe((events: any) => {
          if(events.type === HttpEventType.Response) {
            this.alertService.success("Successfully exported assignment. You can now upload it to " + this.settings.lmsSelection + ".");
            let zipFileBuffer: Blob = events.body;
            let blob = new Blob([zipFileBuffer], { type: "application/zip"});
            this.fileSaverService.save(blob, this.assignmentName + ".zip");
            this.appService.isLoading$.next(false);
          }
        }, (responseError) => {
          let blob = new Blob([responseError.error], { type: "text/plain"});
          const reader = new FileReader();
          reader.addEventListener('loadend', (e) => {
            try {
              const error = JSON.parse(reader.result.toString());
              this.alertService.error(error.message);
              this.appService.isLoading$.next(false);
            } catch (e) {
              this.alertService.error("Unexpected error occurred!");
              this.appService.isLoading$.next(false);
            }
          });
          reader.readAsText(blob);
        })
      }
    };
    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldFinalizeAndExportFn);
  }



  ngOnDestroy(): void {
    if(!this.subscription.closed)
      this.subscription.unsubscribe();
  }
}
