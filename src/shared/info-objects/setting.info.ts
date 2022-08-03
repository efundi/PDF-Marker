export const SettingInfoVersion = 1;

export interface SettingInfo {
  version: number;
  email: string;
  name: string;
  lmsSelection: string;

  defaultPath: string;

  folders: string[];

  /**
   * List of markers configured for the application
   */
  markers: Marker[];

  /**
   * List of groups
   */
  groups: Group[];
  groupMembers: GroupMember[];
}


export interface Marker {
  id: string;
  name: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface GroupMember {
  markerId: string;
  groupId: string;
}
