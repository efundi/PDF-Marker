import {contextBridge, ipcRenderer} from 'electron';
import {AssignmentIpcService} from './src/shared/ipc/assignment.ipc-service';
import {UpdateAssignment} from '@shared/info-objects/update-assignment';
import {CreateAssignmentInfo} from '@shared/info-objects/create-assignment.info';
import {ExportAssignmentsRequest} from './src/shared/info-objects/export-assignments-request';
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
import {LectureImportInfo} from './src/shared/info-objects/lecture-import.info';
import {GenerateIpcService} from './src/shared/ipc/generate.ipc-service';
import {ConvertIpcService} from './src/shared/ipc/convert.ipc-service';
import {OpenFileInfo, SaveFileInfo} from './src/shared/info-objects/file-filter.info';

contextBridge.exposeInMainWorld('updateApi', {
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  restartApplication: () => ipcRenderer.send('update:restart')
} as UpdateIpcService);

contextBridge.exposeInMainWorld('assignmentApi', {
  createAssignment: (createAssignmentInfo: CreateAssignmentInfo) => ipcRenderer.invoke('assignments:create', createAssignmentInfo),
  updateAssignment: (updateRequest: UpdateAssignment) => ipcRenderer.invoke('assignments:update', updateRequest),
  saveMarks: (location: string, submissionInfo: SubmissionInfo) => ipcRenderer.invoke('assignments:saveMarks', location, submissionInfo),
  getAssignmentSettings: (workspaceName: string, assignmentName: string) => ipcRenderer.invoke('assignments:getAssignmentSettings', workspaceName, assignmentName),
  updateAssignmentSettings: (updatedSettings: any, workspaceName: string, assignmentName: string) => ipcRenderer.invoke('assignments:updateAssignmentSettings', updatedSettings, workspaceName, assignmentName),
  finalizeAssignment: (workspaceFolder: any, assignmentName: string, zipFilePath: string) => ipcRenderer.invoke('assignments:finalizeAssignment', workspaceFolder, assignmentName, zipFilePath),
  getMarks: (location: string) => ipcRenderer.invoke('assignments:getMarks', location),
  exportAssignment: (shareRequest: ExportAssignmentsRequest) => ipcRenderer.invoke('assignments:exportAssignment', shareRequest),
  updateAssignmentRubric: (workspaceName: string, assignmentName: string, rubricName: string, ) => ipcRenderer.invoke('assignments:updateAssignmentRubric', workspaceName, assignmentName, rubricName),
  getPdfFile: (location: string) => ipcRenderer.invoke('assignments:getPdfFile', location),
  generateAllocationZipFiles: (workspaceName: string, assignmentName: string, exportPath: string) => ipcRenderer.invoke('assignments:generateAllocationZipFiles', workspaceName, assignmentName, exportPath),
  isMarkerAllocated: (markerId: string) => ipcRenderer.invoke('assignments:isMarkerAllocated', markerId),

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
  lectureImport: (importInfo: LectureImportInfo) => ipcRenderer.invoke('import:lectureImport', importInfo),
  validateLectureImport: (importInfo: LectureImportInfo) => ipcRenderer.invoke('import:validateLectureImport', importInfo),
} as ImportIpcService);


contextBridge.exposeInMainWorld('workspaceApi', {
  getAssignments: () => ipcRenderer.invoke('workspace:get'),
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
  getFile: (fileFilter: OpenFileInfo) => ipcRenderer.invoke('app:getFile', fileFilter),
  saveFile: (fileFilter: SaveFileInfo) => ipcRenderer.invoke('app:saveFile', fileFilter),
  openExternalLink: (link: any) => ipcRenderer.invoke('app:openExternalLink', link),
} as ApplicationIpcService);

contextBridge.exposeInMainWorld('generateApi', {
  generateGenericZip: (studentCount: number, assignmentName: string, sourceFilePath: string) => ipcRenderer.invoke('generate:generateGenericZip', studentCount, assignmentName, sourceFilePath)
    .then((result) => console.log(result), (error) => console.error(error)),
  generateAssignment: (studentCount: number, assignmentName: string, sourceFilePath: string, rubricName?: string) => ipcRenderer.invoke('generate:generateAssignment', studentCount, assignmentName, sourceFilePath, rubricName)
    .then((result) => console.log(result), (error) => console.error(error)),
  markSome: (assignmentName: string, workspaceName?: string) => ipcRenderer.invoke('generate:markSome', assignmentName, workspaceName)
    .then((result) => console.log(result), (error) => console.error(error)),
  markAll: (assignmentName: string, workspaceName: string) => ipcRenderer.invoke('generate:markAll', assignmentName, workspaceName)
    .then((result) => console.log(result), (error) => console.error(error)),
} as GenerateIpcService);



contextBridge.exposeInMainWorld('convertApi', {
  convertToPdf: (workspaceName: string, assignmentName: string, filePath: string) => ipcRenderer.invoke('convert:convertToPdf', workspaceName, assignmentName, filePath),
  libreOfficeFind: () => ipcRenderer.invoke('convert:libreOfficeFind'),
  libreOfficeVersion: (path: string) => ipcRenderer.invoke('convert:libreOfficeVersion', path),
} as ConvertIpcService);


