import {IpcResponse} from './ipc-response';
import {IComment} from '../info-objects/comment.class';


export interface CommentIpcService {

  getComments(): Promise<IpcResponse<IComment[]>>;

  deleteComment(commentId: string): Promise<IpcResponse<IComment[]>>;

  addComment(commentText: string): Promise<IpcResponse<IComment[]>>;
}
