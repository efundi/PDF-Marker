import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AssignmentService} from '@sharedModule/services/assignment.service';
import {AppService} from '@coreModule/services/app.service';
import {Observable, of, Subscription} from 'rxjs';
import {RoutesEnum} from '@coreModule/utils/routes.enum';
import {ZipService} from '@coreModule/services/zip.service';
import {WorkspaceService} from '@sharedModule/services/workspace.service';
import {PdfmUtilsService} from "@pdfMarkerModule/services/pdfm-utils.service";

@Component({
  selector: 'pdf-marker-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnChanges  {

  @Input()
  hierarchyModel;

  // usableHierarchyModel: object = {};

  @Input()
  assignmentRootFolder: boolean;

  @Input()
  workspace;

  @Input()
  hierarchyModelKeys;

  hierarchyModelKeys$: Observable<any>;


  private subscription: Subscription;

  @Input()
  filePath: string = undefined;

  @Input()
  parent: string = undefined;

  @Input()
  scrollToElement: HTMLElement;

  isFileSelected: boolean;

  isWorkspaceFolder: boolean;

  workspaceList: string[];

  constructor(private router: Router,
              public assignmentService: AssignmentService,
              private workspaceService: WorkspaceService,
              private appService: AppService,
              private zipService: ZipService) { }

  ngOnInit() {
    if (this.assignmentRootFolder) {
      this.subscription = this.assignmentService.selectedPdfURLChanged().subscribe(pdfFile => {
        if (this.assignmentService.getSelectedPdfLocation().startsWith(this.hierarchyModelKeys[0] + '/')) {
          this.filePath = this.assignmentService.getSelectedPdfLocation();
        } else {
          this.isFileSelected = false;
          this.filePath = undefined;
        }
      });
    }
    // this.subscription = this.workspaceService.dialogResultSource$.subscribe(
    //   dialogResult => {
    //     if (dialogResult && dialogResult.workspaceName && dialogResult.workspaceName !== dialogResult.prevWorkspaceName) {
    //       console.log(dialogResult.prevWorkspaceName);
    //       console.log(dialogResult.workspaceName);
    //     }
    //     if (dialogResult && dialogResult.movedAssignments && dialogResult.movedAssignments.length > 0) {
    //       console.log(dialogResult.movedAssignments);
    //     }
    //   });
  }

  onAssignment(objectName, hierarchyModel, $event) {

    this.workspaceService.getWorkspaces().subscribe((workspaces: string[]) => {
      this.workspaceList = workspaces;
      const folderOrFileKeys = Object.keys(hierarchyModel);
      let isWorkspace = false;
      if (workspaces) {
        const workspaceNames = workspaces.map(item => {
          return PdfmUtilsService.basename(item);
        });

        if (folderOrFileKeys.length > 0) {
          const assignmentName: string = folderOrFileKeys[0];
          if (workspaceNames.includes(objectName)) {
            isWorkspace = true;
          }
        }
      }
      if (!this.isAssignmentRoot(objectName, hierarchyModel) && isWorkspace) {
        this.appService.isLoading$.next(true);
        this.assignmentService.setSelectedWorkspace(hierarchyModel);
        // if (this.router.url !== RoutesEnum.ASSIGNMENT_WORKSPACE_OVERVIEW)
        this.router.navigate([RoutesEnum.ASSIGNMENT_WORKSPACE_OVERVIEW]);
        $event.stopImmediatePropagation();
      } else if (this.isAssignmentRoot(objectName, hierarchyModel)) {

        // if (this.router.url !== RoutesEnum.ASSIGNMENT_OVERVIEW) {
        if (this.parent !== undefined) {
          this.appService.isLoading$.next(true);
          if (folderOrFileKeys.length > 1) {
            const arr = Object.entries(hierarchyModel).find(x => x[0] === objectName);
            const obj1 = Object.fromEntries(new Map([arr]));
            this.assignmentService.setSelectedAssignment(obj1);
          } else {
            this.assignmentService.setSelectedAssignment(hierarchyModel);
          }
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, this.parent]);
        } else {
          this.appService.isLoading$.next(true);
          this.assignmentService.setSelectedAssignment(hierarchyModel);
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW]);
        }
        // }
        $event.stopImmediatePropagation();
      }
    });
    this.appService.isLoading$.next(false);
  }

  isAssignmentRoot(objectName: string, hierarchyModel: object): boolean {
    const folderOrFileKeys = Object.keys(hierarchyModel);
    if (folderOrFileKeys.length > 0) {
      const assignmentName: string = folderOrFileKeys.length > 1 ? folderOrFileKeys.find(x => x === objectName) : folderOrFileKeys[0];
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
    if ((this.router.url !== RoutesEnum.ASSIGNMENT_MARKER && this.router.url !== RoutesEnum.ASSIGNMENT_MARKER_RUBRIC) || this.assignmentService.getSelectedPdfLocation() !== pdfFileLocation) {
      console.log(pdfFileLocation);
      this.assignmentService.getFile(pdfFileLocation).subscribe(blobData => {
        this.assignmentService.configure(pdfFileLocation, blobData);
      }, error => {
        this.appService.isLoading$.next(false);
        this.appService.openSnackBar(false, 'Unable to read file');
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
