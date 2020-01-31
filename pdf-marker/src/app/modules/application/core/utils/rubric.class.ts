export class Rubric implements IRubric {
  criterias: IRubricCriteria[];

  constructor() {
    this.criterias = [];
  }
}

export interface IRubric {
  rubricId?: number;
  name?: string;
  criterias: IRubricCriteria[];
  inUse?: boolean;
}

export interface IRubricName {
  name?: string;
  inUse?: boolean;
}

export class RubricCriteria implements IRubricCriteria {
  description: string;

  name: string;

  levels: IRubricCriteriaLevels[];

  constructor() {
    this.description = "";
    this.name = "";
    this.levels = [];
  }
}

export interface IRubricCriteria {

  description: string;

  name: string;

  levels: IRubricCriteriaLevels[]
}


export class RubricCriteriaLevels implements IRubricCriteriaLevels {
  score: number;

  description: string;

  label: string;

  constructor() {
    this.score = 0;
    this.description = "";
    this.label = "";
  }
}

export interface IRubricCriteriaLevels {
  score: number;

  description: string;

  label: string;
}
