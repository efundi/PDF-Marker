import {Component, Input, OnChanges, OnInit} from '@angular/core';

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

  constructor() { }

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

  ngOnChanges() {
    this.hierarchyModelKeys = Object.keys(this.hierarchyModel);
  }
}
