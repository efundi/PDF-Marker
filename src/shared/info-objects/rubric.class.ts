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

export interface IRubricCriteria {

  description: string;

  name: string;

  levels: IRubricCriteriaLevels[];
}


export interface IRubricCriteriaLevels {
  score: number;

  description: string;

  label: string;
}


export interface SelectedRubric {
  selectedPath: string;
  rubric: IRubric;
}
