import {
  contextBridge,
  ipcRenderer
} from 'electron';
import {FileFilterInfo} from './src/app/modules/application/core/info-objects/file-filter.info';
import {AssignmentServiceIpc} from './src/shared/ipc/assignment-service-ipc';
import {UpdateAssignment} from './src/shared/info-objects/update-assignment';


contextBridge.exposeInMainWorld('assignmentApi', {
  getAssignments: () => ipcRenderer.invoke('assignments:get'),
  updateAssignment: (updateRequest: UpdateAssignment) => ipcRenderer.invoke('assignments:update', updateRequest),
  saveMarks: (location: any, marks: any[], totalMarks: any) => ipcRenderer.invoke('assignments:saveMarks', location, marks, totalMarks),
  saveRubricMarks: (location: string, rubricName: string, marks: any[] = []) => ipcRenderer.invoke('assignments:saveRubricMarks', location, rubricName, marks),
  getAssignmentSettings: (location: string) => ipcRenderer.invoke('assignments:getAssignmentSettings', location),
  updateAssignmentSettings: (updatedSettings: any, location: string) => ipcRenderer.invoke('assignments:updateAssignmentSettings', updatedSettings, location),
  getMarks: (location: string) => ipcRenderer.invoke('assignments:getMarks', location),
} as AssignmentServiceIpc);

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getFolder: () => ipcRenderer.invoke('app:get_folder'),
  getFile: (fileFilter: FileFilterInfo) => ipcRenderer.invoke('app:get_file', fileFilter),
  saveFile: (fileFilter: FileFilterInfo) => ipcRenderer.invoke('app:save_file', fileFilter),
  getExcelToJson: (fileFilter: FileFilterInfo) => ipcRenderer.invoke('app:get_excel_to_json', fileFilter),
  openExternalLink: (link: any) => ipcRenderer.invoke('app:open_external_link', link),
});
