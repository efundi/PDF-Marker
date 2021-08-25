import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {SettingsService} from "@pdfMarkerModule/services/settings.service";
import {AppService} from "@coreModule/services/app.service";
import {AlertService} from "@coreModule/services/alert.service";
import {ElectronService} from "@coreModule/services/electron.service";
import {AppSelectedPathInfo} from "@coreModule/info-objects/app-selected-path.info";
import {AssignmentService} from "@sharedModule/services/assignment.service";

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
              private alertService: AlertService,
              private electronService: ElectronService,
              private assignmentService: AssignmentService) {
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

  setWorkingDirectory(event) {
    this.electronService.getFolder();
    this.electronService.getFolderOb().subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
      if (appSelectedPathInfo && appSelectedPathInfo.selectedPath)
        this.settingsForm.controls.defaultPath.setValue((appSelectedPathInfo.selectedPath) ? appSelectedPathInfo.selectedPath : null);
      else if (appSelectedPathInfo.error)
        this.alertService.error(appSelectedPathInfo.error.message);
    });
  }

  onSubmit(event) {
    this.alertService.clear();
    if (this.settingsForm.invalid) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }
    this.settingsForm.controls.defaultPath.setValue(this.removeTrailingSlashes(this.settingsForm.controls.defaultPath.value));
    // Call Service to handle rest calls... also use interceptors
    this.isLoading$.next(true);
    this.settingsService.saveConfigurations(this.settingsForm.value).subscribe((response) => {
      this.assignmentService.getAssignments().subscribe(assignments => {
        this.assignmentService.update(assignments);
      });
      this.appService.openSnackBar(true, response.message);
      this.isLoading$.next(false);
    }, error => {
      this.isLoading$.next(false);
    });
  }


  private removeTrailingSlashes(path: string): string {
    return path.replace(/\\+$/, ''); //Removes one or more trailing slashes
  }
}
