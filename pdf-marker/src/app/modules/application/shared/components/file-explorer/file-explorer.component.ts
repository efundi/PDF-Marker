import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {AppService} from "@coreModule/services/app.service";
import {Observable, Subscription} from "rxjs";
import {of} from "rxjs";
import {FormBuilder, FormGroup} from "@angular/forms";

@Component({
  selector: 'pdf-marker-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnChanges  {

  @Input()
  hierarchyModel;

  @Input()
  hierarchyModelKeys;

  hierarchyModelKeys$: Observable<any>;

  @Input()
  first: boolean;

  private subscription: Subscription;

  @Input()
  filePath: string = undefined;

  @Input()
  parent: string = undefined;

  @Input()
  scrollToElement: HTMLElement;

  constructor(private router: Router,
              private assignmentService: AssignmentService,
              private appService: AppService) { }

  ngOnInit() {
    if(this.first) {
      this.subscription = this.assignmentService.selectedPdfURLChanged().subscribe(pdfFile => {
        if(this.assignmentService.getSelectedPdfLocation().startsWith(this.hierarchyModelKeys[0] + "/"))
          this.filePath = this.assignmentService.getSelectedPdfLocation();
        else
          this.filePath = undefined;
      });
    }
  }

  getModelKeys(folder) {
    return Object.keys(this.hierarchyModel[folder]);
  }

  getModel(folder) {
    return this.hierarchyModel[folder];
  }

  isFile(object): boolean {
    return (this.hierarchyModel[object]) ? !!(this.hierarchyModel[object].path):false;
  }

  onAssignment(hierarchyModel) {
    this.appService.isLoading$.next(true);
    this.assignmentService.setSelectedAssignment(hierarchyModel);
    if(this.router.url !== "/marker/assignment/overview")
      this.router.navigate(["/marker/assignment/overview"]);
  }

  scrollToFile() {
    this.scrollToElement.scrollIntoView({ block: 'start', behavior: 'smooth'});
    this.filePath = undefined;
  }

  isSelected() {
    return ((JSON.stringify(this.hierarchyModel) === JSON.stringify(this.assignmentService.getSelectedAssignment())) && this.router.url === "/marker/assignment/overview");
  }

  onSelectedPdf(pdfFileLocation: string) {
    if(this.router.url !== "/marker/assignment/marking" || this.assignmentService.getSelectedPdfLocation() !== pdfFileLocation) {
      this.assignmentService.getFile(pdfFileLocation).subscribe(blobData => {
        const blob = new Blob([blobData], {type: "application/pdf"});
        const fileUrl = URL.createObjectURL(blob);

        this.assignmentService.setSelectedPdfURL(fileUrl, pdfFileLocation);
        this.assignmentService.setSelectedPdfBlob(blob);
        if (this.router.url !== "/marker/assignment/marking")
          this.router.navigate(["/marker/assignment/marking"]);
      }, error => {
        this.appService.isLoading$.next(false);
        this.appService.openSnackBar(false, "Unable to open file")
      })
    }
  }

  ngOnChanges() {
    this.hierarchyModelKeys = Object.keys(this.hierarchyModel);
    this.hierarchyModelKeys$ = of(Object.keys(this.hierarchyModel));
  }
}
