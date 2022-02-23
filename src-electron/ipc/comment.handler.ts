import {readFile, writeFile} from 'fs/promises';
import {IComment} from '@shared/info-objects/comment.class';
import {ensureConfigDirectory} from './config.handler';
import {COMMENTS_FILE, COULD_NOT_READ_COMMENT_LIST} from '../constants';
import {existsSync} from 'fs';
import {isJson} from '../utils';
import {IpcMainInvokeEvent} from 'electron';
import {randomUUID} from 'crypto';

function ensureCommentsFile(): Promise<string> {
  return ensureConfigDirectory()
    .then((configDirectory) => {
      if (existsSync(configDirectory + COMMENTS_FILE)) {
        return configDirectory + COMMENTS_FILE;
      } else {
        return writeFile(configDirectory + COMMENTS_FILE, '[]')
          .then(() => configDirectory + COMMENTS_FILE);
      }
    });
}

export function updateCommentsFile(comments: IComment[]): Promise<IComment[]> {
  return ensureCommentsFile().then((commentsFilePath) => {
    return writeFile(commentsFilePath, JSON.stringify(comments));
  })
    .then(() => comments, () => Promise.reject(COULD_NOT_READ_COMMENT_LIST));
}

export function getComments(): Promise<IComment[]> {
  return ensureCommentsFile().then((commentsFilePath) => {
      return readFile(commentsFilePath).then((data) => {
        if (!isJson(data)) {
          return Promise.reject(COULD_NOT_READ_COMMENT_LIST);
        }
        return getCommentsDetails(JSON.parse(data.toString()));
      });
  });
}


export function deleteComment(event: IpcMainInvokeEvent, commentId: string): Promise<IComment[]> {
  return getComments().then((comments) => {
    let indexFound = -1;
    for (let i = 0; i < comments.length; i++) {
      if (comments[i].id === commentId) {
        indexFound = i;
        break;
      }
    }

    if (indexFound === -1) {
      return Promise.reject('Could not find comment');
    }
    comments.splice(indexFound, 1);
    const newComments = getCommentsDetails(comments);
    return updateCommentsFile(newComments);
  });
}


export function addComment(event: IpcMainInvokeEvent, commentText: string): Promise<IComment[]> {
  return getComments().then(comments => {
    comments.push({
      id: randomUUID(),
      inUse: false,
      title: commentText
    });

    return updateCommentsFile(comments);
  });
}

function getCommentsDetails(comments: IComment[]) {
  const commentNames: IComment[] = [];
  if (Array.isArray(comments)) {
    comments.forEach(comment => {
      const commentName = {
        id: '' + comment.id,
        title: comment.title,
        inUse: comment.inUse
      };
      commentNames.push(commentName);
    });
    return commentNames;
  }
  return commentNames;
}
