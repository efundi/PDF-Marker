import {Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Subscription} from 'rxjs';
import {Marker, SettingInfo} from '@shared/info-objects/setting.info';
import {MarkersManageComponent} from '../markers-manage.component';
import {cloneDeep, filter, find, findIndex, indexOf, isNil, remove} from 'lodash';
import {uuidv4} from '../../../utils/utils';
import {CdkDrag, CdkDragDrop, CdkDragStart, CdkDropList} from '@angular/cdk/drag-drop';

export interface MarkerItem extends Marker {
  groupCount: number;
}

export interface GroupItem {
  groupId: string;
  name: string;
  members: Marker[];
}

@Component({
  selector: 'pdf-marker-groups-tab',
  templateUrl: './groups-tab.component.html',
  styleUrls: ['./groups-tab.component.scss']
})
export class GroupsTabComponent implements OnInit, OnDestroy {
  isEditing = false;

  formGroup: FormGroup;

  groupItems: GroupItem[] = [];

  markers: MarkerItem[] = [];

  @ViewChild(CdkDropList)
  cdkDropList: CdkDropList;

  @ViewChildren('membersList')
  groupDropLists: QueryList<CdkDropList>;

  activeGroupIndex;

  private settingsSubscription: Subscription;

  private originalSettings: SettingInfo;

  constructor(private markersManageComponent: MarkersManageComponent,
              private formBuilder: FormBuilder) {
    this.initForm();
  }

  private initForm() {
    this.formGroup = this.formBuilder.group({
      groupName: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.settingsSubscription = this.markersManageComponent.settingsLoaded.subscribe((settings) => {
      this.originalSettings = settings;
      this.populateExpansions();
    });
  }

  ngOnDestroy() {
    this.settingsSubscription.unsubscribe();
  }

  private populateExpansions(): void {
    if (!isNil(this.originalSettings.groups)) {
      this.groupItems = this.originalSettings.groups.map((group) => {
        const groupItem: GroupItem = {
          groupId: group.id,
          name: group.name,
          members: []
        };

        if (!isNil(this.originalSettings.groupMembers)) {
          groupItem.members = this.originalSettings.groupMembers
            .filter((gm) => gm.groupId === groupItem.groupId)
            .map((gm) => {
              return find(this.originalSettings.markers, {id: gm.markerId});
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        }

        return groupItem;
      });
    }

    if (!isNil(this.originalSettings.markers)) {
      this.markers = this.originalSettings.markers.map((marker) => {
        return {
          ...marker,
          groupCount : filter(this.originalSettings.groupMembers, {markerId: marker.id}).length
        };
      })
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  addGroup(): void {
    const settings = cloneDeep(this.originalSettings);
    if (isNil(settings.groups)) {
      settings.groups = [];
    }
    settings.groups.push({
      id: uuidv4(),
      name: this.formGroup.value.groupName
    });
    this.markersManageComponent.saveSettings(settings).subscribe({
      next: () => {
        this.isEditing = false;
        this.formGroup.reset();
      },
      error: () => {

      }
    });

  }

  private addToGroup(markerId: string, groupId: string) {
    const settings = cloneDeep(this.originalSettings);
    if (isNil(settings.groupMembers)) {
      settings.groupMembers = [];
    }
    settings.groupMembers.push({
      markerId,
      groupId
    });
    this.markersManageComponent.saveSettings(settings).subscribe({
      next: () => {
      },
      error: () => {

      }
    });
  }

  private removeFromGroup(markerId: string, groupId: string) {
    const settings = cloneDeep(this.originalSettings);
    if (isNil(settings.groupMembers)) {
      settings.groupMembers = [];
    }
    remove(settings.groupMembers, (gm) => {
      return gm.groupId === groupId && gm.markerId === markerId;
    });
    this.markersManageComponent.saveSettings(settings).subscribe({
      next: () => {
      },
      error: () => {

      }
    });
  }

  cancelAddGroup() {
    this.formGroup.reset();
    this.isEditing = false;
  }

  removeMember(event: CdkDragDrop<Marker[]>) {
    if (event.previousContainer === event.container) {
      // Nothing to do if dropped in same container
      return;
    }
    const member = event.item.data;
    const group = this.groupItems[this.activeGroupIndex];
    this.removeFromGroup(member.id, group.groupId);
  }

  canAddMember = (drag: CdkDrag<MarkerItem>, drop: CdkDropList<MarkerItem[]>) => {
    const groupMember = drag.data;
    const group = this.groupItems[this.activeGroupIndex];
    const existingMember = find(group.members, {id: groupMember.id})
    return isNil(existingMember);
  }

  addMember(event: CdkDragDrop<Marker[]>) {
    if (event.previousContainer === event.container) {
      // Nothing to do if dropped in same container
      return;
    }
    const member = event.item.data;
    const group = this.groupItems[this.activeGroupIndex];
    this.addToGroup(member.id, group.groupId);
  }

  groupExpanded(expanded: boolean, index: number) {
    if (expanded) {
      this.activeGroupIndex = index;
    }
  }
}
