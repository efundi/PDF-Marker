import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {SettingsService} from '../../services/settings.service';
import {AppService} from '../../services/app.service';
import {AlertService} from '../../services/alert.service';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {BusyService} from '../../services/busy.service';
import {mergeMap, Subscription, tap} from 'rxjs';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {cloneDeep, isEqual, isNil} from 'lodash';
import {WorkspaceService} from '../../services/workspace.service';
import {ConvertService} from '../../services/convert.service';

@Component({
  selector: 'pdf-marker-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  settingsForm: FormGroup<{
    name: FormControl<string>,
    email: FormControl<string>,
    lmsSelection: FormControl<string>,
    defaultPath: FormControl<string>,
    libreOfficePath: FormControl<string>,
  }>;
  settingsLMSSelected = 'Sakai';
  lmsChoices: string[] = ['Sakai'];
  private originalSettings: SettingInfo;

  libreOfficeVersion = '';
  libreOfficeError: string = null;
  /**
   * Flag if autoscanning for libre office path is allowed
   */
  libreOfficeAutoscan = true;

  private libreOfficeSubscription: Subscription;

  private static removeTrailingSlashes(path: string): string {
    return path.replace(/\\+$/, ''); // Removes one or more trailing slashes
  }

  constructor(private fb: FormBuilder,
              private settingsService: SettingsService,
              private appService: AppService,
              private alertService: AlertService,
              private busyService: BusyService,
              private workspaceService: WorkspaceService,
              private convertService: ConvertService) {

    this.initForm();
  }

  ngOnInit() {

    this.busyService.start();
    this.settingsService.getConfigurations().subscribe({
      next: configurations => {
        this.originalSettings = configurations;
        this.settingsForm.reset({
          name: configurations.user ? configurations.user.name : null,
          email: configurations.user ? configurations.user.email : null,
          lmsSelection: configurations.lmsSelection ? configurations.lmsSelection : this.settingsLMSSelected,
          defaultPath: configurations.defaultPath,
          libreOfficePath: configurations.libreOfficePath
        });
        this.busyService.stop();
      },
      error: () => {
        this.busyService.stop();
      }
    });
  }

  autoscanLibreOffice(): void {
    this.convertService.libreOfficeFind().subscribe({
      next: (path) => {
        this.libreOfficeAutoscan = true;
        this.settingsForm.patchValue({
          libreOfficePath: path
        });
      }, error: () => {
        this.libreOfficeAutoscan = false;
      }
    });
  }

  private loadLibreOfficeVersion(path: string) {
    this.libreOfficeVersion = 'loading...';
    this.libreOfficeError = null;
    this.convertService.libreOfficeVersion(path).subscribe({
      next: (version) => {
        this.libreOfficeVersion = version;
      }, error: (error) => {
          this.libreOfficeError = error;
      }
    });
  }

  private initForm() {
    this.settingsForm = this.fb.group({
      name: [null as string, Validators.required],
      email: [null as string, Validators.compose([Validators.required, Validators.email])],
      lmsSelection: ['Sakai', Validators.required],
      defaultPath: [null as string, Validators.required],
      libreOfficePath: [null as string, Validators.required],
    });

    this.libreOfficeSubscription = this.settingsForm.get('libreOfficePath').valueChanges.subscribe({
      next: (path) => {
        if (isNil(path)) {
          this.libreOfficeAutoscan = true;
          this.libreOfficeError = 'Libre Office path is not configured. You will not be able to convert documents to PDF.';
        } else {
          this.loadLibreOfficeVersion(path);
        }
      }
    });
  }

  setWorkingDirectory() {
    this.appService.getFolder()
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        if (appSelectedPathInfo && appSelectedPathInfo.selectedPath) {
          this.settingsForm.patchValue({
            defaultPath: appSelectedPathInfo.selectedPath
          });
        } else if (appSelectedPathInfo.error) {
          this.alertService.error(appSelectedPathInfo.error.message);
        }
      });
  }

  setLibreOfficePath() {
    this.appService.getFile({
      filters: [{
        name: 'Libre Office',
        extensions: ['*']
      }]
    }).subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
      if (appSelectedPathInfo && appSelectedPathInfo.selectedPath) {
        this.settingsForm.patchValue({
          libreOfficePath: appSelectedPathInfo.selectedPath
        });
        this.loadLibreOfficeVersion(appSelectedPathInfo.selectedPath);
      } else if (appSelectedPathInfo.error) {
        this.alertService.error(appSelectedPathInfo.error.message);
      }
    });
  }

  private populateSettings(): SettingInfo {
    const settings = cloneDeep(this.originalSettings);
    const formValue = this.settingsForm.value;
    if (!isNil(formValue.name)) {
      settings.user.name = SettingsComponent.removeTrailingSlashes(formValue.name);
    }
    if (!isNil(formValue.email)) {
      settings.user.email = SettingsComponent.removeTrailingSlashes(formValue.email);
    }
    settings.lmsSelection = formValue.lmsSelection;
    settings.defaultPath = SettingsComponent.removeTrailingSlashes(formValue.defaultPath);
    settings.libreOfficePath = formValue.libreOfficePath;
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
        tap((updatedSettings) => this.originalSettings = updatedSettings),
        mergeMap(() => this.workspaceService.refreshWorkspaces())
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
    return !isEqual(this.originalSettings, this.populateSettings());
  }
}
