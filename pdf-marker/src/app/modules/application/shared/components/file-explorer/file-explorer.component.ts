import {Component, Input, OnInit} from '@angular/core';
import {ZipService} from "../../../core/services/zip.service";

@Component({
  selector: 'pdf-marker-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit {

  hierarchyModel$ = this.zipService.hierarchyModel$;

  @Input()
  hierarchyModel;

  @Input()
  hierarchyModelKeys;

  constructor(private zipService: ZipService) { }

  ngOnInit() {
    this.hierarchyModel$.subscribe(value => {
      if(value !== null && value !== undefined) {
        this.hierarchyModel = value;
        this.hierarchyModelKeys = Object.keys(this.hierarchyModel);
        this.zipService.setModel(null);
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

}
