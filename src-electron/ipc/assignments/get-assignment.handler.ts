import {IpcApiHandler} from "../ipc-api-handler";

export class GetAssignmentHandler implements IpcApiHandler<string, any>{
  readonly channel = 'get_assignments';

  handle(request: string): Promise<any> {
    return Promise.resolve(undefined);
  }

}


export function getAssignments(): Promise<any> {
  return new Promise<any>((resolve) => {
    setTimeout(() => {
      resolve("Done");
    }, 2000)
  });
}
