export class Comment implements IComment {
 // criterias: IRubricCriteria[];

  constructor() {
   // this.criterias = [];
  }
}

export interface IComment {
  commentID?: number;
  commentDsc?: string;
  inUse?: boolean;
}

export class ICommentDsc implements IComment{
  commentDsc?: string;
  inUse?: boolean;

  constructor() {
  this.commentDsc = "";
}

}
