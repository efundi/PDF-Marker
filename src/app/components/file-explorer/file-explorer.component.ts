import {Component, Input, OnChanges, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AssignmentService} from '../../services/assignment.service';
import {AppService} from '../../services/app.service';
import {Subscription} from 'rxjs';
import {RoutesEnum} from '../../utils/routes.enum';
import {ZipService} from '../../services/zip.service';
import {WorkspaceService} from '../../services/workspace.service';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';

@Component({
  selector: 'pdf-marker-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnChanges, OnDestroy  {

  @Input()
  hierarchyModel;

  // usableHierarchyModel: object = {};

  @Input()
  assignmentRootFolder: boolean;

  @Input()
  workspace;

  @Input()
  hierarchyModelKeys;

  private subscription: Subscription;

  @Input()
  filePath: string = undefined;

  @Input()
  parent: string = undefined;

  @Input()
  scrollToElement: HTMLElement;

  isWorkspaceFolder: boolean;

  workspaceList: string[];

  constructor(private router: Router,
              public activatedRoute: ActivatedRoute,
              public assignmentService: AssignmentService,
              private workspaceService: WorkspaceService,
              private appService: AppService,
              private zipService: ZipService) { }

  ngOnInit() {
    if (this.assignmentRootFolder) {
      this.assignmentService.selectedSubmissionChanged.subscribe((selectedSubmission) => {
        if (selectedSubmission) {
          this.filePath = selectedSubmission.pdfPath;
        }
        // Ignore if current selected submission changes to null, else it collapses the whole tree
      });
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
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
        this.router.navigate([RoutesEnum.ASSIGNMENT_WORKSPACE_OVERVIEW, objectName]);
        $event.stopImmediatePropagation();
      } else if (this.isAssignmentRoot(objectName, hierarchyModel)) {
        if (this.parent !== undefined) {
          this.appService.isLoading$.next(true);
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, objectName, this.parent]);
        } else {
          this.appService.isLoading$.next(true);
          this.router.navigate([RoutesEnum.ASSIGNMENT_OVERVIEW, objectName]);
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
  }

  onSelectedPdf(hierarchiralModel: any) {
    const assignmentPath = PdfmUtilsService.dirname(hierarchiralModel.path, 3);
    const workspacePath = PdfmUtilsService.dirname(hierarchiralModel.path, 4);
    const assignmentName = PdfmUtilsService.basename(assignmentPath);
    const workspaceName = PdfmUtilsService.defaultWorkspaceName(workspacePath);
    this.assignmentService.selectSubmission({
      workspaceName,
      assignmentName,
      pdfPath: hierarchiralModel.path
    });
    this.router.navigate([RoutesEnum.ASSIGNMENT_MARKER, workspaceName, assignmentName, hierarchiralModel.path]);
  }

  checkIfWorkspace(hierarchyModel) {

  }

  ngOnChanges() {
    this.hierarchyModelKeys = Object.keys(this.hierarchyModel);
    this.checkIfWorkspace(this.hierarchyModel);
  }


}
