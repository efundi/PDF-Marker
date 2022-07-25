import {AfterViewInit, Component, NgZone, OnInit, ViewChild} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup, NgForm,
  ValidationErrors, ValidatorFn,
  Validators
} from '@angular/forms';
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
import {Observable, Subscription} from 'rxjs';

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

  /**
   * Reference to the create marker form group
   */
  markerFormGroup: FormGroup;

  /**
   * Reference to the list of markers form aray
   */
  markersFormArray: FormArray;

  /**
   * Columns to display in the table
   */
  displayedColumns: string[] = ['name', 'email', 'groups', 'actions'];

  /**
   * Data source for the markers table
   */
  dataSource = new MatTableDataSource<MarkersTableData>([]);

  /**
   * Paginator for the markers table
   */
  @ViewChild(MatPaginator, {static: true})
  paginator: MatPaginator;

  /**
   * Reference to the marker form
   */
  @ViewChild('markerForm', {static: true})
  markerForm: NgForm;

  /**
   * Reference to the markers table sorter
   */
  @ViewChild(MatSort, {static: true})
  sort: MatSort;

  /**
   * Original settings as returned from file
   * @private
   */
  private originalSettings: SettingInfo;

  constructor(private formBuilder: FormBuilder,
              private appService: AppService,
              private settingsService: SettingsService,
              private busyService: BusyService,
              private zone: NgZone) {

    this.initForm();
  }

  /**
   * Initialise forms
   * @private
   */
  private initForm() {
    this.markerFormGroup = this.formBuilder.group({
      name: [null, Validators.required],
      email: [null, Validators.compose([Validators.required, Validators.email, this.formValidateUniqueEmail()])]
    });

    this.markersFormArray = this.formBuilder.array([]);
  }

  /**
   * Get a marker form control from the array
   * @param index
   * @param name
   */
  getFormControl(index: number, name: string): FormControl {
    return this.markersFormArray.at(index).get(name) as FormControl;
  }

  /**
   * Creates a form validatorFn that can validate unique email
   * @param existingId
   * @private
   */
  private formValidateUniqueEmail (existingId?: string): ValidatorFn {
    return (ac: FormControl) => {
      if (this.validateUniqueEmail(ac.value, existingId)) {
        return null;
      } else {
        return {unique: 'Email already used'};
      }
    };
  }

  /**
   * Validate if the name is unique in the list of existing markers.
   * Optionally the existingId can be provided to avoid matching the same record
   * @param name The name to check for uniqueness
   * @param existingId Optional existing id (only required for edits)
   * @private
   */
  private validateUniqueName(name: string, existingId?: string): boolean {
    if (isNil(name)) {
      return true;
    }

    const existing = find(this.originalSettings.markers, (marker) => {
      const nameMatch =  marker.name.toLocaleLowerCase() === name.toLocaleLowerCase();
      const isSame = !isNil(existingId) && existingId === marker.id;

      return nameMatch && !isSame;
    });
    return isNil(existing);
  }


  /**
   * Validate if the email is unique in the lsit of existing markers.
   * Optionally the existingId can be provided to avoid matching the same recorrd.
   * @param email The email to check for uniqueness
   * @param existingId Optional existing id (only required for edits)
   * @private
   */
  private validateUniqueEmail(email: string, existingId?: string): boolean {
    if (isNil(email)) {
      return null;
    }

    const existing = find(this.originalSettings.markers, (marker) => {
      const nameMatch =  marker.email.toLocaleLowerCase() === email.toLocaleLowerCase();
      const isSame = !isNil(existingId) && existingId === marker.id;

      return nameMatch && !isSame;
    });
    return isNil(existing);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnInit(): void {
    this.busyService.start();
    this.loadMarkers();
  }

  /**
   * Load the existing markers from file
   * @private
   */
  private loadMarkers(): void {
    this.settingsService.getConfigurations().subscribe({
      next: (settings) => {
        this.originalSettings = settings;
        this.markerFormGroup.reset();
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

    this.markersFormArray.clear();
    this.originalSettings.markers.forEach((marker) => {
      this.markersFormArray.push(this.formBuilder.group({
        name: [marker.name, Validators.required],
        email: [marker.email, Validators.compose([Validators.required, Validators.email, this.formValidateUniqueEmail(marker.id)])]
      }), {emitEvent: false});
    });
    this.markersFormArray.updateValueAndValidity();
  }

  private populateMarker(): Marker {
    const formValue = this.markerFormGroup.value;
    return {
      id: uuidv4(),
      email: formValue.email.toLocaleLowerCase(),
      name: formValue.name,
    };
  }

  private saveSettings(updatedSettings: SettingInfo): void {
    this.busyService.start();
    this.settingsService.saveConfigurations(updatedSettings).subscribe({
      next: (settings) => {
        this.originalSettings = settings;
        this.updateTable();
        this.markerFormGroup.reset();
        this.markerForm.resetForm();
        this.busyService.stop();
        this.appService.openSnackBar(true, 'Settings updated');
      },
      error: () => {
        this.markerFormGroup.reset();
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
