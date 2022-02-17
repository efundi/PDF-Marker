import {
  contextBridge,
  ipcRenderer
} from "electron";

contextBridge.exposeInMainWorld('electronAPI', {
  getAssignments: () => ipcRenderer.invoke('assignments:get')
});
