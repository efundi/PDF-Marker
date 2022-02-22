import {contextBridge, ipcRenderer} from 'electron';
import {FileFilterInfo} from './src/app/modules/application/core/info-objects/file-filter.info';
import {AssignmentServiceIpc} from './src/shared/ipc/assignment-service-ipc';
import {UpdateAssignment} from './src/shared/info-objects/update-assignment';
import {CreateAssignmentInfo} from './src/shared/info-objects/create-assignment.info';
import {ShareAssignments} from './src/shared/info-objects/share-assignments';
import {RubricServiceIpc} from './src/shared/ipc/rubric-service-ipc';
import {IRubric} from './src/shared/info-objects/rubric.class';
import {ImportInfo} from './src/shared/info-objects/import.info';
import {ImportServiceIpc} from './src/shared/ipc/import-service-ipc';
import {WorkspaceServiceIpc} from './src/shared/ipc/workspace-service-ipc';
import {CommentServiceIpc} from './src/shared/ipc/comment-service-ipc';
import {ConfigServiceIpc} from './src/shared/ipc/config-service-ipc';
import {SettingInfo} from './src/shared/info-objects/setting.info';


contextBridge.exposeInMainWorld('assignmentApi', {
  getAssignments: () => ipcRenderer.invoke('assignments:get'),
  createAssignment: (createAssignmentInfo: CreateAssignmentInfo) => ipcRenderer.invoke('assignments:create', createAssignmentInfo),
  updateAssignment: (updateRequest: UpdateAssignment) => ipcRenderer.invoke('assignments:update', updateRequest),
  saveMarks: (location: any, marks: any[], totalMarks: any) => ipcRenderer.invoke('assignments:saveMarks', location, marks, totalMarks),
  saveRubricMarks: (location: string, rubricName: string, marks: any[] = []) => ipcRenderer.invoke('assignments:saveRubricMarks', location, rubricName, marks),
  getAssignmentSettings: (location: string) => ipcRenderer.invoke('assignments:getAssignmentSettings', location),
  getAssignmentGlobalSettings: (location: string) => ipcRenderer.invoke('assignments:getAssignmentGlobalSettings', location),
  updateAssignmentSettings: (updatedSettings: any, location: string) => ipcRenderer.invoke('assignments:updateAssignmentSettings', updatedSettings, location),
  finalizeAssignment: (workspaceFolder: any, location: string) => ipcRenderer.invoke('assignments:finalizeAssignment', workspaceFolder, location),
  finalizeAssignmentRubric: (workspaceFolder: string, location: string, rubricName: string) => ipcRenderer.invoke('assignments:finalizeAssignmentRubric', workspaceFolder, location, rubricName),
  getMarks: (location: string) => ipcRenderer.invoke('assignments:getMarks', location),
  getGrades: (location: string) => ipcRenderer.invoke('assignments:getGrades', location),
  shareExport: (shareRequest: ShareAssignments) => ipcRenderer.invoke('assignments:shareExport', shareRequest),
  rubricUpdate: (rubricName: string, assignmentName: string) => ipcRenderer.invoke('assignments:rubricUpdate', rubricName, assignmentName),
} as AssignmentServiceIpc);


contextBridge.exposeInMainWorld('rubricApi', {
  getRubricNames: () => ipcRenderer.invoke('rubrics:getRubricNames'),
  rubricUpload: (rubric: IRubric) => ipcRenderer.invoke('rubrics:rubricUpload', rubric),
  selectRubricFile: () => ipcRenderer.invoke('rubrics:selectRubricFile'),
  deleteRubricCheck: (rubricName: string) => ipcRenderer.invoke('rubrics:deleteRubricCheck', rubricName),
  deleteRubric: (rubricName: string) => ipcRenderer.invoke('rubrics:deleteRubric', rubricName),
  getRubric: (rubricName: string) => ipcRenderer.invoke('rubrics:getRubric', rubricName),
} as RubricServiceIpc);


contextBridge.exposeInMainWorld('importApi', {
  importZip: (importInfo: ImportInfo) => ipcRenderer.invoke('import:importZip', importInfo),
  getZipEntries: (filePath: string) => ipcRenderer.invoke('import:getZipEntries', filePath),
  isValidSakaiZip: (filePath: string) => ipcRenderer.invoke('import:isValidSakaiZip', filePath),
} as ImportServiceIpc);


contextBridge.exposeInMainWorld('workspaceApi', {
  createWorkingFolder: (name: string) => ipcRenderer.invoke('workspace:createWorkingFolder', name),
  updateWorkspaceName: (workspaceName: string, newWorkspaceName: string) => ipcRenderer.invoke('workspace:updateWorkspaceName', workspaceName, newWorkspaceName),
  moveWorkspaceAssignments: (currentWorkspaceName: string, workspaceName: string, assignments: any[]) => ipcRenderer.invoke('workspace:moveWorkspaceAssignments', currentWorkspaceName, workspaceName, assignments),
  getWorkspaces: () => ipcRenderer.invoke('workspace:getWorkspaces'),
  deleteWorkspace: (workspaceFolder: string) => ipcRenderer.invoke('workspace:deleteWorkspace', workspaceFolder),
  deleteWorkspaceCheck: (workspaceFolder: string) => ipcRenderer.invoke('workspace:deleteWorkspaceCheck', workspaceFolder),
} as WorkspaceServiceIpc);


contextBridge.exposeInMainWorld('commentApi', {
  getComments: () => ipcRenderer.invoke('comments:getComments'),
  deleteComment: (commentId: string) => ipcRenderer.invoke('comments:deleteComment', commentId),
  addComment: (commentText: string) => ipcRenderer.invoke('comments:addComment', commentText)
} as CommentServiceIpc);


contextBridge.exposeInMainWorld('configApi', {
  getConfig: () => ipcRenderer.invoke('config:getConfig'),
  updateConfig: (config: SettingInfo) => ipcRenderer.invoke('config:updateConfig', config),
} as ConfigServiceIpc);


contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getFolder: () => ipcRenderer.invoke('app:get_folder'),
  getFile: (fileFilter: FileFilterInfo) => ipcRenderer.invoke('app:get_file', fileFilter),
  saveFile: (fileFilter: FileFilterInfo) => ipcRenderer.invoke('app:save_file', fileFilter),
  openExternalLink: (link: any) => ipcRenderer.invoke('app:open_external_link', link),
});
