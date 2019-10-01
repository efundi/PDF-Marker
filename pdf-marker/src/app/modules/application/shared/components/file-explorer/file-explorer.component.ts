import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ZipService} from "@coreModule/services/zip.service";
import {Subscription} from "rxjs";

@Component({
  selector: 'pdf-marker-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnDestroy {

  hierarchyModel$ = this.zipService.hierarchyModel$;

  @Input()
  hierarchyModel;

  @Input()
  hierarchyModelKeys;

  private subscription: Subscription;

  constructor(private zipService: ZipService) { }

  ngOnInit() {
    this.subscription = this.hierarchyModel$.subscribe(value => {
      if(value !== null && value !== undefined) {
        this.hierarchyModel = value;
        this.hierarchyModelKeys = Object.keys(this.hierarchyModel);
      }
    });
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

  ngOnDestroy() {
    // unsubscribe to avoid memory leaks
    this.subscription.unsubscribe();
  }

}
