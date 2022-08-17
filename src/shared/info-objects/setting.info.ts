export const SettingInfoVersion = 1;

export const DefaultSettings: SettingInfo = {
  version: SettingInfoVersion,
  folders: [],
  markers: [],
  groups: [],
  groupMembers: []
};

export interface SettingInfo {
  /**
   * Version number of the settings file
   */
  version: number;
  /**
   * Marker for this application user
   */
  user?: Marker;
  lmsSelection?: string;

  defaultPath?: string;
  exportPath?: string;

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
  id?: string;
  name?: string;
  email?: string;
}

export interface Group {
  id?: string;
  name?: string;
}

export interface GroupMember {
  markerId?: string;
  groupId?: string;
}
