import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'pdf-marker-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {


  lmsChoices: string[] = ['Sakai'];
  constructor() { }

  ngOnInit() {
  }

}
