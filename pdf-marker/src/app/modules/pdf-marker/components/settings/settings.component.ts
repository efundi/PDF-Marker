import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {SettingsService} from "@pdfMarkerModule/services/settings.service";
import {AppService} from "@coreModule/services/app.service";
import {AlertService} from "@coreModule/services/alert.service";

@Component({
  selector: 'pdf-marker-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  isLoading$ = this.appService.isLoading$;
  settingsForm: FormGroup;
  settingsLMSSelected = "Sakai";
  lmsChoices: string[] = ['Sakai'];

  constructor(private fb: FormBuilder,
              private settingsService: SettingsService,
              private appService: AppService,
              private  alertService: AlertService) {
  }

  ngOnInit() {
    this.isLoading$.next(true);
    this.settingsService.getConfigurations().subscribe(configurations => {
      this.settingsForm.controls.lmsSelection.setValue(configurations.lmsSelection ? configurations.lmsSelection:this.settingsLMSSelected);
      this.settingsForm.controls.defaultPath.setValue(configurations.defaultPath ? configurations.defaultPath:null);
      this.isLoading$.next(false);
    }, error => {
      this.isLoading$.next(false);
    });
    this.initForm();
  }

  private initForm() {
    this.settingsForm = this.fb.group({
      lmsSelection: ["Sakai", Validators.required],
      defaultPath: [null, Validators.required]
    });
  }

  onSubmit(event) {
    if(this.settingsForm.invalid) {
      event.target.disabled = true;
      return;
    }

    this.settingsForm.controls.defaultPath.setValue(this.removeTrailingSlashes(this.settingsForm.controls.defaultPath.value));
    // Call Service to handle rest calls... also use interceptors
    this.isLoading$.next(true);
    this.settingsService.saveConfigurations(this.settingsForm.value).subscribe((response) => {
      this.alertService.success(response.message);
      this.isLoading$.next(false);
    }, error => {
      this.isLoading$.next(false);
    });
  }

  private removeTrailingSlashes(path: string): string {
    return path.replace(/\\+$/, ''); //Removes one or more trailing slashes
  }
}
