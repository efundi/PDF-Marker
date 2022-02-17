import {
  contextBridge,
  ipcRenderer
} from "electron";
import {getAssignmentSettings} from "./src-electron/ipc/assignments/get-assignment.handler";

contextBridge.exposeInMainWorld('electronAPI', {
  getAssignments: () => ipcRenderer.invoke('assignments:get'),
  saveMarks: (location: any, marks: any[], totalMarks: any) => ipcRenderer.invoke('assignments:saveMarks', location, marks, totalMarks),
  saveRubricMarks: (location: string, rubricName: string, marks: any[] = []) => ipcRenderer.invoke('assignments:saveRubricMarks', location, rubricName, marks),
  getAssignmentSettings: (location: string) => ipcRenderer.invoke('assignments:getAssignmentSettings', location),
});
