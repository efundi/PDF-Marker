import { Component, OnInit } from '@angular/core';
import {FormGroup} from "@angular/forms";

@Component({
  selector: 'pdf-marker-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  settingsForm: FormGroup;
  lmsChoices: string[] = ['Sakai'];
  constructor() { }

  ngOnInit() {
  }

}
