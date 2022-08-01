import {contextBridge, ipcRenderer} from 'electron';
import {FileFilterInfo} from '@shared/info-objects/file-filter.info';
import {AssignmentIpcService} from './src/shared/ipc/assignment.ipc-service';
import {UpdateAssignment} from '@shared/info-objects/update-assignment';
import {CreateAssignmentInfo} from '@shared/info-objects/create-assignment.info';
import {ShareAssignments} from '@shared/info-objects/share-assignments';
import {RubricIpcService} from './src/shared/ipc/rubric.ipc-service';
import {IRubric} from '@shared/info-objects/rubric.class';
import {ImportInfo} from '@shared/info-objects/import.info';
import {ImportIpcService} from './src/shared/ipc/import.ipc-service';
import {WorkspaceIpcService} from './src/shared/ipc/workspace.ipc-service';
import {CommentIpcService} from './src/shared/ipc/comment.ipc-service';
import {ConfigIpcService} from './src/shared/ipc/config.ipc-service';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {ApplicationIpcService} from './src/shared/ipc/application.ipc-service';
import {SubmissionInfo} from './src/shared/info-objects/submission.info';
import {UpdateIpcService} from './src/shared/ipc/update.ipc-service';

contextBridge.exposeInMainWorld('updateApi', {
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  restartApplication: () => ipcRenderer.send('update:restart')
} as UpdateIpcService);

contextBridge.exposeInMainWorld('assignmentApi', {
  getAssignments: () => ipcRenderer.invoke('assignments:get'),
  createAssignment: (createAssignmentInfo: CreateAssignmentInfo) => ipcRenderer.invoke('assignments:create', createAssignmentInfo),
  updateAssignment: (updateRequest: UpdateAssignment) => ipcRenderer.invoke('assignments:update', updateRequest),
  saveMarks: (location: string, submissionInfo: SubmissionInfo) => ipcRenderer.invoke('assignments:saveMarks', location, submissionInfo),
  getAssignmentSettings: (workspaceName: string, assignmentName: string) => ipcRenderer.invoke('assignments:getAssignmentSettings', workspaceName, assignmentName),
  getAssignmentGlobalSettings: (location: string) => ipcRenderer.invoke('assignments:getAssignmentGlobalSettings', location),
  updateAssignmentSettings: (updatedSettings: any, workspaceName: string, assignmentName: string) => ipcRenderer.invoke('assignments:updateAssignmentSettings', updatedSettings, workspaceName, assignmentName),
  finalizeAssignment: (workspaceFolder: any, assignmentName: string) => ipcRenderer.invoke('assignments:finalizeAssignment', workspaceFolder, assignmentName),
  finalizeAssignmentRubric: (workspaceFolder: string, location: string, rubricName: string) => ipcRenderer.invoke('assignments:finalizeAssignmentRubric', workspaceFolder, location, rubricName),
  getMarks: (location: string) => ipcRenderer.invoke('assignments:getMarks', location),
  getGrades: (workspaceFolder: string, assignmentName: string) => ipcRenderer.invoke('assignments:getGrades', workspaceFolder, assignmentName),
  shareExport: (shareRequest: ShareAssignments) => ipcRenderer.invoke('assignments:shareExport', shareRequest),
  updateAssignmentRubric: (workspaceName: string, assignmentName: string, rubricName: string, ) => ipcRenderer.invoke('assignments:updateAssignmentRubric', workspaceName, assignmentName, rubricName),
  getPdfFile: (location: string) => ipcRenderer.invoke('assignments:getPdfFile', location),
} as AssignmentIpcService);


contextBridge.exposeInMainWorld('rubricApi', {
  getRubricNames: () => ipcRenderer.invoke('rubrics:getRubricNames'),
  rubricUpload: (rubric: IRubric) => ipcRenderer.invoke('rubrics:rubricUpload', rubric),
  selectRubricFile: () => ipcRenderer.invoke('rubrics:selectRubricFile'),
  deleteRubricCheck: (rubricName: string) => ipcRenderer.invoke('rubrics:deleteRubricCheck', rubricName),
  deleteRubric: (rubricName: string) => ipcRenderer.invoke('rubrics:deleteRubric', rubricName),
  getRubric: (rubricName: string) => ipcRenderer.invoke('rubrics:getRubric', rubricName),
  getRubrics: () => ipcRenderer.invoke('rubrics:getRubrics'),
} as RubricIpcService);


contextBridge.exposeInMainWorld('importApi', {
  importZip: (importInfo: ImportInfo) => ipcRenderer.invoke('import:importZip', importInfo),
  getZipEntries: (filePath: string) => ipcRenderer.invoke('import:getZipEntries', filePath),
  validateZipFile: (filePath: string, format: string) => ipcRenderer.invoke('import:validateZipFile', filePath, format),
} as ImportIpcService);


contextBridge.exposeInMainWorld('workspaceApi', {
  createWorkingFolder: (name: string) => ipcRenderer.invoke('workspace:createWorkingFolder', name),
  updateWorkspaceName: (workspaceName: string, newWorkspaceName: string) => ipcRenderer.invoke('workspace:updateWorkspaceName', workspaceName, newWorkspaceName),
  moveWorkspaceAssignments: (currentWorkspaceName: string, workspaceName: string, assignments: any[]) => ipcRenderer.invoke('workspace:moveWorkspaceAssignments', currentWorkspaceName, workspaceName, assignments),
  getWorkspaces: () => ipcRenderer.invoke('workspace:getWorkspaces'),
  deleteWorkspace: (workspaceFolder: string) => ipcRenderer.invoke('workspace:deleteWorkspace', workspaceFolder),
  deleteWorkspaceCheck: (workspaceFolder: string) => ipcRenderer.invoke('workspace:deleteWorkspaceCheck', workspaceFolder),
} as WorkspaceIpcService);


contextBridge.exposeInMainWorld('commentApi', {
  getComments: () => ipcRenderer.invoke('comments:getComments'),
  deleteComment: (commentId: string) => ipcRenderer.invoke('comments:deleteComment', commentId),
  addComment: (commentText: string) => ipcRenderer.invoke('comments:addComment', commentText)
} as CommentIpcService);


contextBridge.exposeInMainWorld('configApi', {
  getConfig: () => ipcRenderer.invoke('config:getConfig'),
  updateConfig: (config: SettingInfo) => ipcRenderer.invoke('config:updateConfig', config),
} as ConfigIpcService);

contextBridge.exposeInMainWorld('applicationApi', {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getFolder: () => ipcRenderer.invoke('app:getFolder'),
  getFile: (fileFilter: FileFilterInfo) => ipcRenderer.invoke('app:getFile', fileFilter),
  saveFile: (fileFilter: FileFilterInfo) => ipcRenderer.invoke('app:saveFile', fileFilter),
  openExternalLink: (link: any) => ipcRenderer.invoke('app:openExternalLink', link),
} as ApplicationIpcService);
