import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {cloneDeep, find, isNil, remove, findIndex, filter} from 'lodash';
import {MatDialogConfig} from '@angular/material/dialog';
import {
  YesAndNoConfirmationDialogComponent
} from '../../yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {MarkersManageComponent} from '../markers-manage.component';
import {
  NgForm,
  ValidatorFn,
  Validators,
  FormGroup, FormControl, FormBuilder, FormArray
} from '@angular/forms';
import {Marker, SettingInfo} from '@shared/info-objects/setting.info';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {Subscription} from 'rxjs';
import {AppService} from '../../../services/app.service';
import {uuidv4} from '../../../utils/utils';



export interface MarkersTableData extends Marker {
  groups: string[];
  editing: false;

  /**
   * Index reference from the original data source
   */
  index: number;
}


@Component({
  selector: 'pdf-marker-markers-tab',
  templateUrl: './markers-tab.component.html',
  styleUrls: ['./markers-tab.component.scss']
})
export class MarkersTabComponent implements OnInit, AfterViewInit, OnDestroy {
  /**
   * Reference to the create marker form group
   */
  markerFormGroup: FormGroup<{
    name: FormControl<string>,
    email: FormControl<string>,
  }>;

  /**
   * Reference to the list of markers form aray
   */
  markersFormArray: FormArray<FormGroup<{
    id: FormControl<string>,
    name: FormControl<string>,
    email: FormControl<string>
  }>>;

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

  private settingsSubscription: Subscription;

  private originalSettings: SettingInfo;


  constructor(private formBuilder: FormBuilder,
              private markersManageComponent: MarkersManageComponent,
              private appService: AppService) {
    this.initForm();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }
  /**
   * Initialise forms
   * @private
   */
  private initForm() {
    this.markerFormGroup = this.formBuilder.group({
      name: [null as string, Validators.required],
      email: [null as string, Validators.compose([
          Validators.required,
          Validators.email,
          this.formValidateUniqueEmail(),
          this.formValidateSelfAsMarker()
        ])]
    });

    this.markersFormArray = new FormArray([]);
  }

  ngOnInit(): void {
    this.settingsSubscription = this.markersManageComponent.settingsLoaded.subscribe((settings) => {
      this.originalSettings = settings;
      this.markerFormGroup.reset();
      this.updateTable();
    });
  }

  ngOnDestroy() {
    this.settingsSubscription.unsubscribe();
  }

  /**
   * Get a marker form control from the array
   * @param index
   * @param name
   */
  getFormControl(index: number, name: string): FormControl<any> {
    return this.markersFormArray.at(index).get(name) as FormControl<any>;
  }

  private formValidateSelfAsMarker(): ValidatorFn {
    return (ac: FormControl<string>) => {
      if (this.validateSelfAsMarker(ac.value)) {
        return null;
      } else {
        return {selfMarker: 'User may not be added as a marker'};
      }
    };
  }

  /**
   * Creates a form validatorFn that can validate unique email
   * @param existingId
   * @private
   */
  private formValidateUniqueEmail(existingId?: string): ValidatorFn {
    return (ac: FormControl<string>) => {
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
      const nameMatch =  marker.name.toLowerCase() === name.toLowerCase();
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
    if (isNil(email) || email.trim() === '') {
      return true;
    }

    const existing = find(this.originalSettings.markers, (marker) => {
      const nameMatch =  marker.email.toLowerCase() === email.toLowerCase();
      const isSame = !isNil(existingId) && existingId === marker.id;

      return nameMatch && !isSame;
    });
    return isNil(existing);
  }

  /**
   * The user of the application may not self be added as a marker
   * @param email
   * @private
   */
  private validateSelfAsMarker(email: string): boolean {
    if (isNil(email) || email.trim() === '') {
      return true;
    }

    const userEmail = this.originalSettings.user.email;
    if (isNil(userEmail) || userEmail === '') {
      // If the user has no email set up, there is nothing to validate agains
      return true;
    }
    return userEmail.toLowerCase() !== email.toLowerCase();
  }


  private updateTable(): void {
    this.dataSource.data = this.originalSettings.markers.map((marker, index) => {
      const groups: string[] = filter(this.originalSettings.groupMembers, {markerId: marker.id}).map((gm) => {
        const group = find(this.originalSettings.groups, {id: gm.groupId});
        return group.name;
      });


      return {
        ...marker,
        groups,
        editing: false,
        index
      };
    });

    this.markersFormArray.clear();
    this.originalSettings.markers.forEach((marker) => {
      this.markersFormArray.push(this.formBuilder.group({
        id: [marker.id],
        name: [marker.name, Validators.required],
        email: [marker.email, Validators.compose([
          Validators.required,
          Validators.email,
          this.formValidateUniqueEmail(marker.id),
          this.formValidateSelfAsMarker()
        ])]
      }), {emitEvent: false});
    });
    this.markersFormArray.updateValueAndValidity();
  }

  private populateMarker(formValue: any): Marker {
    return {
      id: formValue.id || uuidv4(),
      email: formValue.email.toLocaleLowerCase(),
      name: formValue.name,
    };
  }

  addMarker() {
    const marker = this.populateMarker(this.markerFormGroup.value);
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

  private saveSettings(settings: SettingInfo): void {
    this.markersManageComponent.saveSettings(settings).subscribe({
      next: () => {
        this.markerFormGroup.reset();
        this.markerForm.resetForm();
      },
      error: () => {
        this.markerFormGroup.reset();
      }
    });
  }

  cancelEdit(tableItem: MarkersTableData): void {
    const originalMarker = this.originalSettings.markers[tableItem.index];
    const formGroup = this.markersFormArray.at(tableItem.index);
    formGroup.reset(originalMarker);
    tableItem.editing = false;
  }

  updateMaker(tableItem: MarkersTableData): void {
    const formGroup = this.markersFormArray.at(tableItem.index);
    const marker = this.populateMarker(formGroup.value);
    const uniqueName = this.validateUniqueName(marker.name, marker.id);
    const updateSettings = cloneDeep(this.originalSettings);
    const existingIndex = findIndex(updateSettings.markers, {id: marker.id});
    updateSettings.markers[existingIndex] = marker;

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
}
