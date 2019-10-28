import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {SakaiService} from "@coreModule/services/sakai.service";
import {Router} from "@angular/router";
import {Subscription} from "rxjs";
import {AppService} from "@coreModule/services/app.service";
import {MatPaginator} from "@angular/material/paginator";
import {MatTableDataSource} from "@angular/material/table";

export interface AssignmentDetails {
  studentName: string;

  studentNumber: string;

  assignment: string

  grade: number;

  path: string;
};

@Component({
  selector: 'pdf-marker-assignment-overview',
  templateUrl: './assignment-overview.component.html',
  styleUrls: ['./assignment-overview.component.scss']
})
export class AssignmentOverviewComponent implements OnInit, OnDestroy {
  private hierarchyModel;
  displayedColumns: string[] = ['studentName', 'assignment', 'grade'];
  dataSource: MatTableDataSource<AssignmentDetails>;
  assignmentName: string = 'Assignment Name';
  assignmentsLength;
  assignmentPageSizeOptions: number[];
  private readonly submissionFolder = "Submission attachment(s)";

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  //readonly regEx = /(.*)\(([0-9]+)\)/;
  readonly regEx = /(.*)\((.+)\)/;
  private subscription: Subscription;
  constructor(private assignmentService: AssignmentService,
              private sakaiService: SakaiService,
              private router: Router,
              private appService: AppService) { }

  ngOnInit() {
    this.subscription = this.assignmentService.selectedAssignmentChanged().subscribe((selectedAssignment) => {
      this.hierarchyModel = selectedAssignment;
      this.generateDataFromModel();
    }, error => {
      this.appService.isLoading$.next(false);
    });

    if(!this.hierarchyModel && !!this.assignmentService.getSelectedAssignment()) {
      this.hierarchyModel = this.assignmentService.getSelectedAssignment();
      this.generateDataFromModel();
    } else {
      this.router.navigate(["/marker"])
    }

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
          path: null
        };
        const matches = this.regEx.exec(key);
        value.studentName = matches[1];
        value.studentNumber = matches[2];
        value.assignment = this.hierarchyModel[this.assignmentName][key][this.submissionFolder] ? Object.keys(this.hierarchyModel[this.assignmentName][key][this.submissionFolder])[0]:'';
        value.grade = 0;
        value.path = (value.assignment) ? this.assignmentName + '/' + key + "/" + this.submissionFolder + "/" + value.assignment:'';
        values.push(value);
      }
    });
    this.dataSource = new MatTableDataSource(values);
    this.dataSource.paginator = this.paginator;
    this.assignmentsLength = values.length;
    const range = [];
    let i = 0;
    while(i <= this.assignmentsLength) {
        i += 5;
        range.push(i);

      if(i > this.assignmentsLength)
        break;
    }
    this.assignmentPageSizeOptions = range;
    this.appService.isLoading$.next(false);
  }

  onSelectedPdf(pdfFileLocation: string) {
    this.assignmentService.getFile(pdfFileLocation).subscribe(blobData => {
      const blob = new Blob([blobData], { type: "application/pdf"});
      const fileUrl = URL.createObjectURL(blob);

      this.assignmentService.setSelectedPdfURL(fileUrl, pdfFileLocation);
      if(this.router.url !== "/marker/assignment/marking")
        this.router.navigate(["/marker/assignment/marking"]);
    })
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
