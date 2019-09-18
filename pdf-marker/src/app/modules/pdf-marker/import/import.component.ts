import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  readonly acceptMimeType = "application/zip";

  file: File;

  constructor() { }

  ngOnInit() {
  }

  onFileChange(event) {
  }
}
