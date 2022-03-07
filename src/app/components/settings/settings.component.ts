import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {SettingsService} from '../../services/settings.service';
import {AppService} from '../../services/app.service';
import {AlertService} from '../../services/alert.service';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {AssignmentService} from '../../services/assignment.service';
import {BusyService} from '../../services/busy.service';
import {mergeMap} from 'rxjs';

@Component({
  selector: 'pdf-marker-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  settingsForm: FormGroup;
  settingsLMSSelected = 'Sakai';
  lmsChoices: string[] = ['Sakai'];



  constructor(private fb: FormBuilder,
              private settingsService: SettingsService,
              private appService: AppService,
              private alertService: AlertService,
              private busyService: BusyService,
              private assignmentService: AssignmentService) {

    this.initForm();
  }

  ngOnInit() {

    this.busyService.start();
    this.settingsService.getConfigurations().subscribe(configurations => {
      this.settingsForm.controls.lmsSelection.setValue(configurations.lmsSelection ? configurations.lmsSelection : this.settingsLMSSelected);
      this.settingsForm.controls.defaultPath.setValue(configurations.defaultPath ? configurations.defaultPath : null);
      this.busyService.stop();
    }, error => {
      this.busyService.stop();
    });
  }

  private initForm() {
    this.settingsForm = this.fb.group({
      lmsSelection: ['Sakai', Validators.required],
      defaultPath: [null, Validators.required]
    });
  }

  setWorkingDirectory(event) {
    this.appService.getFolder()
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        if (appSelectedPathInfo && appSelectedPathInfo.selectedPath) {
          this.settingsForm.controls.defaultPath.setValue((appSelectedPathInfo.selectedPath) ? appSelectedPathInfo.selectedPath : null);
        } else if (appSelectedPathInfo.error) {
          this.alertService.error(appSelectedPathInfo.error.message);
        }
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
    this.busyService.start();
    this.settingsService.saveConfigurations(this.settingsForm.value)
      .pipe(
        mergeMap(() => this.assignmentService.refreshWorkspaces())
      )
      .subscribe(() => {
        this.appService.openSnackBar(true, 'Successfully updated settings!');
        this.busyService.stop();
      }, error => {
        this.busyService.stop();
      });
  }


  private removeTrailingSlashes(path: string): string {
    return path.replace(/\\+$/, ''); // Removes one or more trailing slashes
  }
}
