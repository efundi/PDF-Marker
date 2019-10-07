import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'pdf-marker-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  settingsForm: FormGroup;
  settingsLMSSelected = "Sakai";
  lmsChoices: string[] = ['Sakai'];

  constructor(private fb: FormBuilder,) {
  }

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.settingsForm = this.fb.group({
      lmsSelection: ["Sakai", Validators.required],
      defaultPath: [null]
    });
  }
}
