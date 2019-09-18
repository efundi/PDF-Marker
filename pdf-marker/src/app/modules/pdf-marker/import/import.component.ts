import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  readonly acceptMimeType = "application/zip";

  readonly floatLabelType = "always";

  constructor() { }

  ngOnInit() {
  }
}
