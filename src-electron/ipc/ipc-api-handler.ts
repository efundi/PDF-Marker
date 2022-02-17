export interface IpcApiHandler<Request, Response> {

  readonly channel: string;

  handle(request: Request): Promise<Response>;

}

