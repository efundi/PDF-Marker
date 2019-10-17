import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {AppService} from "@coreModule/services/app.service";
import {Observable} from "rxjs";
import {of} from "rxjs";

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

  constructor(private router: Router,
              private assignmentService: AssignmentService,
              private appService: AppService) { }

  ngOnInit() {
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

  isSelected() {
    return ((JSON.stringify(this.hierarchyModel) === JSON.stringify(this.assignmentService.getSelectedAssignment())) && this.router.url === "/marker/assignment/overview");
  }

  ngOnChanges() {
    this.hierarchyModelKeys = Object.keys(this.hierarchyModel);
    this.hierarchyModelKeys$ = of(Object.keys(this.hierarchyModel));
  }
}
