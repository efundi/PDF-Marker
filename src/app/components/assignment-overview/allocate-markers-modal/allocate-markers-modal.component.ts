import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {SettingsService} from '../../../services/settings.service';
import {GroupMember, Marker, SettingInfo} from '@shared/info-objects/setting.info';
import {Subscription} from 'rxjs';
import {cloneDeep, filter, find, isNil, shuffle, sortBy, without} from 'lodash';
import {StudentSubmission, TreeNodeType, WorkspaceAssignment} from '@shared/info-objects/workspace';
import {
  AssignmentSettingsInfo,
  Submission,
  SubmissionAllocation,
  SubmissionState
} from '@shared/info-objects/assignment-settings.info';
import {AppSelectedPathInfo} from '@shared/info-objects/app-selected-path.info';
import {AppService} from '../../../services/app.service';
import {BusyService} from '../../../services/busy.service';
import {AlertService} from '../../../services/alert.service';

interface Allocation {
  marker: Marker;
  submissions: Submission[];
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
    exportPath: FormControl<string>,
  }>;
  submissions: Submission[] = [];
  allocations: Allocation[] = [];
  assignmentName: string;
  studentCount: number;
  private formSubscription: Subscription;
  private workspaceName: string;
  zipFileCount: number;

  constructor(private formBuilder: FormBuilder,
              public settingsService: SettingsService,
              public dialogRef: MatDialogRef<AllocateMarkersModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              private alertService: AlertService,
              private busyService: BusyService,
              private appService: AppService) {
    this.initForm();
  }

  private initForm(): void {
    this.formGroup = this.formBuilder.group({
      groupId: [null as string, Validators.compose([Validators.required, this.formEmptyGroupValidator()])],
      includeMe: [false],
      exportPath: [null as string, Validators.required]
    });

    this.formSubscription = this.formGroup.valueChanges.subscribe((value) => {
      if (this.formGroup.valid) {
        this.calculateAllocation(value.groupId, value.includeMe);
      } else {
        this.allocations = [];
      }
    });
  }

  /**
   * Creates a form validatorFn that can validate unique email
   * @private
   */
  private formEmptyGroupValidator(): ValidatorFn {
    return (ac: FormControl<string>) => {
      if (this.emptyGroupValidator(ac.value)) {
        return null;
      } else {
        return {emptyGroup: 'Group has no members'};
      }
    };
  }

  private emptyGroupValidator(groupId: string): boolean {
    if (isNil(groupId)) {
      return true;
    }
    const groupMembers: GroupMember[] = filter(this.settings.groupMembers, {groupId});
    return groupMembers.length > 0;
  }

  ngOnDestroy() {
    this.formSubscription.unsubscribe();
  }

  ngOnInit(): void {
    this.assignmentName = this.data.assignmentName;
    const assignmentSettings: AssignmentSettingsInfo = this.data.assignmentSettings;
    const workspaceAssignment: WorkspaceAssignment = this.data.workspaceAssignment;
    const studentDirectories: StudentSubmission[] = workspaceAssignment.children.filter(i => i.type === TreeNodeType.SUBMISSION) as StudentSubmission[];
    this.studentCount = studentDirectories.length;
    this.submissions = studentDirectories.filter(submissionDirectory => {
      return !isNil(submissionDirectory.children.find(f => f.type === TreeNodeType.SUBMISSIONS_DIRECTORY).children[0]);
    })
      .map(s => find(assignmentSettings.submissions, {directoryName: s.name}) as Submission)
      .filter(s => !isNil(s));
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
    const myAllocation: Allocation = {
      submissions: [],
      marker: {
        email : this.settings.user.email,
        name : this.settings.user.name,
        id : this.settings.user.id,
      }
    };
    if (includeMe) {
      allocations.push(myAllocation);
    }
    allocations = shuffle(allocations);

    // Allocate submission that user already started with
    let availableSubmissionsToAllocate = cloneDeep(this.submissions);
    myAllocation.submissions = filter(availableSubmissionsToAllocate, (submission) => {
      return submission.state === SubmissionState.MARKED ||
        submission.state === SubmissionState.SENT_FOR_MODERATION ||
        submission.state === SubmissionState.MODERATED;
    });
    availableSubmissionsToAllocate = without(availableSubmissionsToAllocate, ...myAllocation.submissions);

    // Check if there is someone to assign to
    if (allocations.length > 0) {
      const allocationSubmissions = shuffle(availableSubmissionsToAllocate);
      let markerIdx = 0;
      for (let allocated = 0; allocated < allocationSubmissions.length; allocated++) {
        allocations[markerIdx++].submissions.push(allocationSubmissions[allocated]);

        if (markerIdx === allocations.length) {
          markerIdx = 0;
        }
      }
    }
    if (!includeMe && myAllocation.submissions.length > 0) {
      allocations.push(myAllocation);
    }
    this.allocations = sortBy(allocations, 'marker.name');
    this.calculateZipFileCount();
  }

  private calculateZipFileCount(): void {
    this.zipFileCount = this.allocations.filter((allocation) => allocation.marker.id !== this.settings.user.id).length;
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

  submit() {
    const allocations: SubmissionAllocation[] = [];
    this.allocations.forEach(a => {
      const marker: Marker = a.marker;
      a.submissions.forEach((submission) => {
        allocations.push({
          marker: {
            email: marker.email,
            id: marker.id
          },
          studentId: submission.studentId
        });
      });
    });

    this.dialogRef.close({
      allocations,
      exportPath : this.formGroup.value.exportPath
    });
  }

  setExportDirectory() {
    this.busyService.start();
    this.appService.getFolder()
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        this.busyService.stop();
        if (appSelectedPathInfo && appSelectedPathInfo.selectedPath) {
          this.formGroup.patchValue({
            exportPath: appSelectedPathInfo.selectedPath
          });
        } else if (appSelectedPathInfo.error) {
          this.alertService.error(appSelectedPathInfo.error.message);
        }
      });
  }
}
