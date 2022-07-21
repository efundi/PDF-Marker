import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {Marker, SettingInfo} from '@shared/info-objects/setting.info';
import {SettingsService} from '../../services/settings.service';
import {cloneDeep, isNil, remove} from 'lodash';
import {BusyService} from '../../services/busy.service';
import {AppService} from '../../services/app.service';

export interface MarkersTableData extends Marker {
  groups: boolean;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
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
      email: [null, Validators.required],
    });
  }

  ngAfterViewInit() {
    // this.sort.sort(sort);
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
        groups: false // TODO calculate groups
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
        this.appService.openSnackBar(true, "Settings updated");
      },
      error: () => {
        this.busyService.stop();
      }
    });
  }

  addMarker() {
    const marker = this.populateMarker();
    const updateSettings = cloneDeep(this.originalSettings);
    if (isNil(updateSettings.markers)) {
      updateSettings.markers = [];
    }
    updateSettings.markers.push(marker);
    this.saveSettings(updateSettings);
  }

  removeMarker(element: MarkersTableData) {
    const updateSettings = cloneDeep(this.originalSettings);
    updateSettings.markers = remove(updateSettings.markers, (item) => item.id !== element.id);
    this.saveSettings(updateSettings);
  }
}
