export interface GenerateIpcService {
  generateGenericZip(studentCount: number, assignmentName: string, sourceFilePath: string): Promise<void>;
  generateAssignment(studentCount: number, assignmentName: string, sourceFilePath: string, rubricName?: string): Promise<void>;
  markSome(assignmentName: string, workspaceName: string): Promise<void>;
  markAll(assignmentName: string, workspaceName: string): Promise<void>;
  generateGroups(): Promise<void>;
}
