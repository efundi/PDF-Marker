import {Component, Inject, OnInit} from '@angular/core';
import {Marker, SettingInfo} from '@shared/info-objects/setting.info';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Submission} from '@shared/info-objects/assignment-settings.info';
import {SettingsService} from '../../../services/settings.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'pdf-marker-reallocate-submissions-modal',
  templateUrl: './reallocate-submissions-modal.component.html',
  styleUrls: ['./reallocate-submissions-modal.component.scss']
})
export class ReallocateSubmissionsModalComponent implements OnInit {


  markers: Marker[] = [];

  settings: SettingInfo;
  formGroup: FormGroup<{
    marker: FormControl<Marker | null>,
  }>;
  submissions: Submission[] = [];
  assignmentName: string;
  studentCount: number;

  constructor(private formBuilder: FormBuilder,
              public settingsService: SettingsService,
              public dialogRef: MatDialogRef<ReallocateSubmissionsModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any) {
    this.initForm();
  }

  private initForm(): void {
    this.formGroup = this.formBuilder.group({
      marker: [null as Marker, Validators.required],
    });
  }


  ngOnInit(): void {
    this.assignmentName = this.data.assignmentName;
    this.studentCount = this.data.submissions.length;
    this.submissions = this.data.submissions;
    this.loadSettings();
  }


  private loadSettings(): void {
    this.settingsService.getConfigurations().subscribe({
      next: (settings) => {
        this.settings = settings;

        const markers: Marker[] = [{
          id: settings.user.id,
          email: settings.user.email,
          name: 'Me'
        }];
        markers.push(...settings.markers);

        this.markers = markers.filter((marker) => {
          return marker.id !== this.submissions[0].allocation.id;
        });
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  onClose() {
    this.dialogRef.close();
  }

  submit() {
    this.dialogRef.close(this.formGroup.value.marker);
  }
}
