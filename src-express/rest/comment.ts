import {checkClient, isJson, readFromFile, sendResponse, sendResponseData} from '../utils';
import {
  COMMENTS_FILE,
  CONFIG_DIR,
  COULD_NOT_READ_COMMENT_LIST,
  FORBIDDEN_RESOURCE, NOT_CONFIGURED_CONFIG_DIRECTORY,
  NOT_PROVIDED_COMMENT
} from '../constants';
import {validationResult} from 'express-validator';
import {existsSync, mkdir, readFileSync, writeFileSync} from 'fs';
import {IComment} from '../../src/app/modules/application/core/utils/comment.class';

export const saveNewComment = async (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponseData(req, res, 400, {errors: errors.array()});
  }

  if (!existsSync(CONFIG_DIR + COMMENTS_FILE)) {
    await writeFileSync(CONFIG_DIR + COMMENTS_FILE, '[]');
  }

  const configData = readFileSync(CONFIG_DIR + COMMENTS_FILE);
  const comments: IComment[] = JSON.parse(configData.toString());
  // ----
  const foundCount = comments.length + 1;

  comments.push({id: foundCount, title: req.body.newComment, inUse: false});

  console.log(comments);

  try {
    await writeFileSync(CONFIG_DIR + COMMENTS_FILE, JSON.stringify(comments));
  } catch (e) {
    return sendResponseData(req, res, 500, false);
  }
  return sendResponseData(req, res, 200, comments);
};



/*READ COMMENTS DETAIL*/
export const getComments = async (req, res) => {

  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }
  if (!existsSync(CONFIG_DIR)) {
    return mkdir(CONFIG_DIR, err => {
      if (err) {
        return sendResponse(req, res, 500, COULD_NOT_READ_COMMENT_LIST);
      }
    });
  } else {
    if (existsSync(CONFIG_DIR + COMMENTS_FILE)) {
      return readFromFile(req, res, CONFIG_DIR + COMMENTS_FILE, (data) => {
        if (!isJson(data)) {
          return sendResponse(req, res, 400, COULD_NOT_READ_COMMENT_LIST);
        }
        const comments: IComment[] = getCommentsDetails(JSON.parse(data.toString()));
        if (Array.isArray(comments)) {
          return sendResponseData(req, res, 200, comments);
        }

      });
    } else {
      await writeFileSync(CONFIG_DIR + COMMENTS_FILE, '[]');
    }
  }
};


export const deleteCommentFn = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (!req.body.id) {
    return sendResponse(req, res, 400, NOT_PROVIDED_COMMENT);
  }

  const id: number = req.body.id;
  let found = false;

  return readFromFile(req, res, CONFIG_DIR + COMMENTS_FILE, (data) => {
    if (!isJson(data)) {
      return sendResponse(req, res, 400, NOT_CONFIGURED_CONFIG_DIRECTORY);
    }
    const comments: IComment[] = getCommentsDetails(JSON.parse(data.toString()));

    try {
      for (let i = 0; i < comments.length; i++) {
        if (comments[i].id === id) {
          found = true;
          break;
        }
      }
      return sendResponseData(req, res, 200, found);
    } catch (e) {
      return sendResponse(req, res, 500, e.message);
    }
  });
};

export const deleteCommentConfirmation = (req, res) => {
  if (!checkClient(req, res)) {
    return sendResponse(req, res, 401, FORBIDDEN_RESOURCE);
  }

  if (!req.body.id) {
    return sendResponse(req, res, 400, NOT_PROVIDED_COMMENT);
  }

  if (!req.body.id) {
    return sendResponse(req, res, 400, FORBIDDEN_RESOURCE);
  }

  const id: number = req.body.id;

  if (existsSync(CONFIG_DIR + COMMENTS_FILE)) {
    return readFromFile(req, res, CONFIG_DIR + COMMENTS_FILE, async (data) => {
      if (!isJson(data)) {
        return sendResponse(req, res, 400, COULD_NOT_READ_COMMENT_LIST);
      }
      console.log(data);
      const comments: IComment[] = JSON.parse(data.toString());
      console.log(comments);
      if (Array.isArray(comments)) {
        let indexFound = -1;
        for (let i = 0; i < comments.length; i++) {
          if (comments[i].id === id) {
            indexFound = i;
            break;
          }
        }

        if (indexFound === -1) {
          return sendResponse(req, res, 404, 'Could not find comment');
        }

        comments.splice(indexFound, 1);
        const newComments = getCommentsDetails(comments);

        try {
          writeFileSync(CONFIG_DIR + COMMENTS_FILE, JSON.stringify(newComments));
        } catch (e) {
          return sendResponse(req, res, 500, COULD_NOT_READ_COMMENT_LIST);
        }

        return sendResponseData(req, res, 200, newComments);
      }
    });
  }
  return sendResponseData(req, res, 500, []);
};

const getCommentsDetails = (comments: IComment[]) => {
  const commentNames: IComment[] = [];
  if (Array.isArray(comments)) {
    comments.forEach(comment => {
      const commentName = {id: comment.id, title: comment.title, inUse: comment.inUse};
      commentNames.push(commentName);
    });
    return commentNames;
  }
  return commentNames;
};
