# Generate APIs (DEVELOPMENT only!)
There are APIs available within the electron browser console.

## Generate Generic Zip
Generates a generic zip file that can be imported to the application.

```typescript
generateApi.generateGenericZip(studentCount: number, assignmentName: string, sourceFilePath: string): Promise<void>
```

| Parameter          | type     | Description                                                  |
|--------------------|----------|--------------------------------------------------------------|
| **studentCount**   | `number` | Number of submissions to include in the zip                  |
| **assignmentName** | `string` | Name of the assignment to generate                           |
| **sourceFilePath** | `string` | Absolute path to the source file to use as a submission file |

**Example**
```typescript
generateApi.generateGenericZip(100, 'Test Assignment', '/home/dev/Downloads/source.pdf');
```

## Generate a Assignment
Generates an assignment in the application's default workspace

```typescript
generateApi.generateAssignment(studentCount: number, assignmentName: string, sourceFilePath: string, rubricName?: string): Promise<void>
```

| Parameter          | type     | Description                                                  |
|--------------------|----------|--------------------------------------------------------------|
| **studentCount**   | `number` | Number of submissions to include in the assignment           |
| **assignmentName** | `string` | Name of the assignment to generate                           |
| **sourceFilePath** | `string` | Absolute path to the source file to use as a submission file |
| **rubricName**     | `string` | (Optional) Name of the rubric to use                         |

The function returns a promise which can safely be ignored, or chained to perform more tasks after the assignment has been created.
The console will print out the location of the created assignment once done.

**Example**
```typescript
generateApi.generateAssignment(100, 'Test Assignment', '/home/dev/Downloads/source.pdf');
```

## Mark some submissions
Randomly marks some the submissions (of those that are not marked yet).

```typescript
generateApi.markSome(assignmentName: string, workspaceName?: string): Promise<void>
```

| Parameter          | type     | Description                                                |
|--------------------|----------|------------------------------------------------------------|
| **assignmentName** | `string` | Name of the assignment to mark                             |
| **workspaceName**  | `string` | (Optional) Name of the workspace containing the assignment |

**Examples**
```typescript
generateApi.markSome('Test Assignment');
generateApi.markSome('Test Assignment', 'Workspace 1');
```

## Mark all submissions
Marks all the submissions for the specified assignment that has not been marked yet.

```typescript
generateApi.markAll(assignmentName: string, workspaceName?: string): Promise<void>
```

| Parameter          | type     | Description                                                |
|--------------------|----------|------------------------------------------------------------|
| **assignmentName** | `string` | Name of the assignment to mark                             |
| **workspaceName**  | `string` | (Optional) Name of the workspace containing the assignment |

**Examples**
```typescript
generateApi.markAll('Test Assignment');
generateApi.markAll('Test Assignment', 'Workspace 1');
```
