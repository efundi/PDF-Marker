import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators} from '@angular/forms';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {Marker, SettingInfo} from '@shared/info-objects/setting.info';
import {SettingsService} from '../../services/settings.service';
import {cloneDeep, find, isNil, remove} from 'lodash';
import {BusyService} from '../../services/busy.service';
import {AppService} from '../../services/app.service';
import {MatDialogConfig} from '@angular/material/dialog';
import {
  YesAndNoConfirmationDialogComponent
} from '../yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {Subscription} from 'rxjs';

export interface MarkersTableData extends Marker {
  groups: boolean;
  editing: false;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

@Component({
  selector: 'pdf-marker-markers-manage',
  templateUrl: './markers-manage.component.html',
  styleUrls: ['./markers-manage.component.scss']
})
export class MarkersManageComponent implements OnInit, AfterViewInit {

  personFormGroup: FormGroup;
  displayedColumns: string[] = ['name', 'email', 'groups', 'actions'];
  readonly pageSize: number = 10;
  dataSource = new MatTableDataSource<MarkersTableData>([]);

  @ViewChild(MatPaginator, {static: true})
  paginator: MatPaginator;

  @ViewChild(MatSort, {static: true})
  sort: MatSort;
  assignmentPageSizeOptions: number[];

  private originalSettings: SettingInfo;

  constructor(private formBuilder: FormBuilder,
              private appService: AppService,
              private settingsService: SettingsService,
              private busyService: BusyService) {

    this.initForm();
  }

  private initForm() {
    this.personFormGroup = this.formBuilder.group({
      name: [null, Validators.required],
      email: [null, Validators.compose([Validators.required, Validators.email, (ac) => this.validateUniqueEmail(ac)])]
    });

  }

  private validateUniqueName(name: string): boolean {
    if (isNil(name)) {
      return true;
    }

    const existing = find(this.originalSettings.markers, (marker) => {
      return marker.name.toLocaleLowerCase() === name.toLocaleLowerCase();
    });
    return isNil(existing);
  }

  private validateUniqueEmail(abstractControl: AbstractControl): ValidationErrors | null {
      const value = abstractControl.value;
      if (isNil(value)) {
        return null;
      }

      const existing = find(this.originalSettings.markers, {email: value});
      if (isNil(existing)) {
        return null;
      } else {
        return {unique: 'Email already used'};
      }
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnInit(): void {
    this.busyService.start();
    this.settingsService.getConfigurations().subscribe({
      next: (settings) => {
        this.originalSettings = settings;
        this.updateTable();
        this.busyService.stop();
      },
      error: () => {
        this.busyService.stop();
      }
    });
  }

  private updateTable(): void {
    this.dataSource.data = (this.originalSettings.markers || []).map((marker) => {
      return {
        ...marker,
        groups: false, // TODO calculate groups
        editing: false
      };
    });
  }

  private populateMarker(): Marker {
    const formValue = this.personFormGroup.value;
    return {
      id: uuidv4(),
      email: formValue.email,
      name: formValue.name,
    };
  }

  private saveSettings(updatedSettings: SettingInfo): void {
    this.busyService.start();
    this.settingsService.saveConfigurations(updatedSettings).subscribe({
      next: (settings) => {
        this.originalSettings = settings;
        this.updateTable();
        this.personFormGroup.reset();
        this.personFormGroup.markAsPristine();
        this.personFormGroup.markAsUntouched();
        this.busyService.stop();
        this.appService.openSnackBar(true, 'Settings updated');
      },
      error: () => {
        this.busyService.stop();
      }
    });
  }

  addMarker() {
    const marker = this.populateMarker();
    const uniqueName = this.validateUniqueName(marker.name);
    const updateSettings = cloneDeep(this.originalSettings);
    if (isNil(updateSettings.markers)) {
      updateSettings.markers = [];
    }
    updateSettings.markers.push(marker);

    if (!uniqueName) {
      const config = new MatDialogConfig();
      config.width = '400px';
      config.maxWidth = '400px';
      config.data = {
        title: 'Duplicate marker',
        message: `A marker named "${marker.name}" already exists, continue?`,
      };
      this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, (accepted) => {
        if (accepted) {
          this.saveSettings(updateSettings);
        }
      });
    } else {
      this.saveSettings(updateSettings);
    }





  }

  removeMarker(element: MarkersTableData) {
    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '400px';
    config.data = {
      title: 'Remove user',
      message: 'Are you sure you want to remove user?',
    };
    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, (accepted) => {
      if (accepted) {
        const updateSettings = cloneDeep(this.originalSettings);
        updateSettings.markers = remove(updateSettings.markers, (item) => item.id !== element.id);
        this.saveSettings(updateSettings);
      }
    });
  }
}
