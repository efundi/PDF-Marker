import {Component, OnInit} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {SettingsService} from '../../services/settings.service';
import {AppService} from '../../services/app.service';
import {AlertService} from '../../services/alert.service';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {AssignmentService} from '../../services/assignment.service';
import {BusyService} from '../../services/busy.service';
import {mergeMap} from 'rxjs';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {cloneDeep, isEqual} from 'lodash';

@Component({
  selector: 'pdf-marker-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  settingsForm: UntypedFormGroup;
  settingsLMSSelected = 'Sakai';
  lmsChoices: string[] = ['Sakai'];
  private originalSettings: SettingInfo;

  private static removeTrailingSlashes(path: string): string {
    return path.replace(/\\+$/, ''); // Removes one or more trailing slashes
  }

  constructor(private fb: UntypedFormBuilder,
              private settingsService: SettingsService,
              private appService: AppService,
              private alertService: AlertService,
              private busyService: BusyService,
              private assignmentService: AssignmentService) {

    this.initForm();
  }

  ngOnInit() {

    this.busyService.start();
    this.settingsService.getConfigurations().subscribe({
      next: configurations => {
        this.originalSettings = configurations;
        this.settingsForm.reset({
          name: configurations.name ? configurations.name : null,
          email: configurations.email ? configurations.email : null,
          lmsSelection: configurations.lmsSelection ? configurations.lmsSelection : this.settingsLMSSelected,
          defaultPath: configurations.defaultPath ? configurations.defaultPath : null
        });
        this.busyService.stop();
      },
      error: () => {
        this.busyService.stop();
      }
    });
  }

  private initForm() {
    this.settingsForm = this.fb.group({
      name: [null, Validators.required],
      email: [null, Validators.compose([Validators.required, Validators.email])],
      lmsSelection: ['Sakai', Validators.required],
      defaultPath: [null, Validators.required]
    });
  }

  setWorkingDirectory() {
    this.appService.getFolder()
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        if (appSelectedPathInfo && appSelectedPathInfo.selectedPath) {
          this.settingsForm.controls.defaultPath.setValue((appSelectedPathInfo.selectedPath) ? appSelectedPathInfo.selectedPath : null);
        } else if (appSelectedPathInfo.error) {
          this.alertService.error(appSelectedPathInfo.error.message);
        }
      });
  }

  private populateSettings(): SettingInfo {
    const settings = cloneDeep(this.originalSettings);
    const formValue = this.settingsForm.value;
    settings.name = SettingsComponent.removeTrailingSlashes(formValue.name);
    settings.email = SettingsComponent.removeTrailingSlashes(formValue.email);
    settings.lmsSelection = formValue.lmsSelection;
    settings.defaultPath = SettingsComponent.removeTrailingSlashes(formValue.defaultPath);
    return settings;
  }

  onSubmit() {
    this.alertService.clear();
    if (this.settingsForm.invalid) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }
    const settings = this.populateSettings();
    // Call Service to handle rest calls... also use interceptors
    this.busyService.start();
    this.settingsService.saveConfigurations(settings)
      .pipe(
        mergeMap(() => this.assignmentService.refreshWorkspaces())
      )
      .subscribe({
        next: () => {
          this.appService.openSnackBar(true, 'Successfully updated settings!');
          this.busyService.stop();
        },
        error: () => {
          this.busyService.stop();
        }
      });
  }

  hasUnsavedChanges(): boolean {
    console.log(this.originalSettings);
    console.log(this.populateSettings());
    return !isEqual(this.originalSettings, this.populateSettings());
  }
}
