import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {AppService} from "@coreModule/services/app.service";
import {Observable, Subscription} from "rxjs";
import {of} from "rxjs";
import {FormBuilder, FormGroup} from "@angular/forms";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {MimeTypesEnum} from "@coreModule/utils/mime.types.enum";
import {RoutesEnum} from "@coreModule/utils/routes.enum";
import {ZipService} from '@coreModule/services/zip.service';

@Component({
  selector: 'pdf-marker-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnChanges  {

  @Input()
  hierarchyModel;

  @Input()
  workspace;

  @Input()
  hierarchyModelKeys;

  hierarchyModelKeys$: Observable<any>;

  @Input()
  assignmentRootFolder: boolean;

  private subscription: Subscription;

  @Input()
  filePath: string = undefined;

  @Input()
  parent: string = undefined;

  @Input()
  scrollToElement: HTMLElement;

  isFileSelected: boolean;

  isWorkspaceFolder: boolean;

  workspaceList: String[];

  constructor(private router: Router,
              public assignmentService: AssignmentService,
              private appService: AppService,
              private zipService: ZipService) { }

  ngOnInit() {
    if(this.assignmentRootFolder) {
      this.subscription = this.assignmentService.selectedPdfURLChanged().subscribe(pdfFile => {
        if(this.assignmentService.getSelectedPdfLocation().startsWith(this.hierarchyModelKeys[0] + "/"))
          this.filePath = this.assignmentService.getSelectedPdfLocation();
        else {
          this.isFileSelected = false;
          this.filePath = undefined;
        }
      });
    }
  }

  onAssignment(hierarchyModel, $event) {

    this.assignmentService.getWorkspaces().subscribe((workspaces: String[]) => {
      this.workspaceList = workspaces;
      console.log("WorkspaceList Pre");
      console.log("WorkspaceList:  " + this.workspaceList);
      if (!this.isAssignmentRoot(hierarchyModel)) {
        this.appService.isLoading$.next(true);
        this.assignmentService.setSelectedWorkspace(hierarchyModel);
        if (this.router.url !== RoutesEnum.ASSIGNMENT_WORKSPACE_OVERVIEW)
          this.router.navigate([RoutesEnum.ASSIGNMENT_WORKSPACE_OVERVIEW]);
        $event.stopImmediatePropagation();
      } else if (this.isAssignmentRoot(hierarchyModel)) {
        this.appService.isLoading$.next(true);
        this.assignmentService.setSelectedAssignment(hierarchyModel);
        if (this.router.url !== RoutesEnum.ASSIGNMENT_OVERVIEW)
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW]);
        $event.stopImmediatePropagation();
      }
    });
    this.appService.isLoading$.next(false);
  }

  isAssignmentRoot(hierarchyModel: object): boolean {
    const folderOrFileKeys = Object.keys(hierarchyModel);
    if (this.assignmentRootFolder === undefined && folderOrFileKeys.length > 0) {
      const assignmentName: string = folderOrFileKeys[0];
      return this.zipService.isValidAssignmentObject(hierarchyModel[assignmentName]);
  }
    if (this.assignmentRootFolder === true && folderOrFileKeys.length > 0) {
      const assignmentName: string = folderOrFileKeys[0];
      return this.zipService.isValidAssignmentObject(hierarchyModel[assignmentName]);
    }
  }


  scrollToFile() {
    this.scrollToElement.scrollIntoView({ block: 'start', behavior: 'smooth'});
    this.filePath = undefined;
    this.isFileSelected = true;
  }

  isSelected() {
    return ((JSON.stringify(this.hierarchyModel) === JSON.stringify(this.assignmentService.getSelectedAssignment())) && this.router.url === RoutesEnum.ASSIGNMENT_OVERVIEW);
  }

  onSelectedPdf(pdfFileLocation: string) {
    if((this.router.url !== RoutesEnum.ASSIGNMENT_MARKER && this.router.url !== RoutesEnum.ASSIGNMENT_MARKER_RUBRIC) || this.assignmentService.getSelectedPdfLocation() !== pdfFileLocation) {
      console.log(pdfFileLocation);
      this.assignmentService.getFile(pdfFileLocation).subscribe(blobData => {
        this.assignmentService.configure(pdfFileLocation, blobData);
      }, error => {
        this.appService.isLoading$.next(false);
        this.appService.openSnackBar(false, "Unable to read file")
      });
    }
  }

  checkIfWorkspace(hierarchyModel) {

  }

  ngOnChanges() {
    this.hierarchyModelKeys = Object.keys(this.hierarchyModel);
    this.hierarchyModelKeys$ = of(Object.keys(this.hierarchyModel));
    this.checkIfWorkspace(this.hierarchyModel);
  }


}
