import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {SettingsService} from '../../../services/settings.service';
import {Marker, SettingInfo} from '@shared/info-objects/setting.info';
import {Subscription} from 'rxjs';
import {filter, find, isNil, shuffle, sortBy} from 'lodash';
import {StudentSubmission, TreeNodeType, WorkspaceAssignment, WorkspaceFile} from '@shared/info-objects/workspace';

interface Allocation {
  marker: Marker;
  submissions: Submission[];
}

interface Submission {
  ref: WorkspaceFile;
}

@Component({
  selector: 'pdf-marker-allocate-markers-modal',
  templateUrl: './allocate-markers-modal.component.html',
  styleUrls: ['./allocate-markers-modal.component.scss']
})
export class AllocateMarkersModalComponent implements OnInit, OnDestroy {


  settings: SettingInfo;
  formGroup: FormGroup<{
    groupId: FormControl<string | null>,
    includeMe: FormControl<boolean>,
  }>;
  submissions: Submission[] = [];
  allocations: Allocation[] = [];
  assignmentName: string;
  studentCount: number;
  private formSubscription: Subscription;

  constructor(private formBuilder: FormBuilder,
              public settingsService: SettingsService,
              public dialogRef: MatDialogRef<AllocateMarkersModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any) {
    this.initForm();
  }

  private initForm(): void {
    this.formGroup = this.formBuilder.group({
      groupId: [null as string, Validators.required],
      includeMe: [false]
    });

    this.formSubscription = this.formGroup.valueChanges.subscribe((value) => {
      if (this.formGroup.valid) {
        this.calculateAllocation(value.groupId, value.includeMe);
      }
    });
  }

  ngOnDestroy() {
    this.formSubscription.unsubscribe();
  }

  ngOnInit(): void {
    this.assignmentName = this.data.assignmentName;
    const workspaceAssignment: WorkspaceAssignment = this.data.workspaceAssignment;
    const studentDirectories: StudentSubmission[] = workspaceAssignment.children.filter(i => i.type === TreeNodeType.SUBMISSION) as StudentSubmission[];
    this.studentCount = studentDirectories.length;
    this.submissions = studentDirectories.map(submission => {
      return submission.children.find(f => f.type === TreeNodeType.SUBMISSIONS_DIRECTORY).children[0];
    })
      // Filter out any that does not have submissions
      .filter(f => !isNil(f))
      .map(s => {
        return {
          ref: s as WorkspaceFile
        };
      });
    this.loadSettings();
  }

  private calculateAllocation(groupId: string, includeMe: boolean): void {
    const settingsMarkers = this.settings.markers || [];
    const settingsGroupMembers = this.settings.groupMembers || [];
    const selectedMembers = filter(settingsGroupMembers, {groupId});
    const members = selectedMembers.map((groupMember) => {
      return find(settingsMarkers, {id: groupMember.markerId});
    });
    let allocations: Allocation[] = members.map((marker) => {
      return {
        marker,
        submissions: []
      };
    });
    if (includeMe) {
      allocations.push({
        submissions: [],
        marker: {
          email : this.settings.email,
          name : (this.settings as any).name,
          id : (this.settings as any).id,
        }
      });
    }
    allocations = shuffle(allocations);


    // Check if there is someone to assign to
    if (allocations.length > 0) {
      const allocationSubmissions = shuffle(this.submissions);
      let markerIdx = 0;
      for (let allocated = 0; allocated < allocationSubmissions.length; allocated++) {
        allocations[markerIdx++].submissions.push({
          ref: allocationSubmissions[allocated].ref
        });

        if (markerIdx === allocations.length) {
          markerIdx = 0;
        }
      }
    }
    this.allocations = sortBy(allocations, 'marker.name');

  }

  private loadSettings(): void {
    this.settingsService.getConfigurations().subscribe({
      next: (settings) => {
        this.settings = settings;
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  onClose() {
    this.dialogRef.close();
  }
}
