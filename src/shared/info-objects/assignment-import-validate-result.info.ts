import {DistributionFormat, SourceFormat} from "@shared/info-objects/assignment-settings.info";

/**
 * An interface describing the result of a assignment zip file validation.
 */
export interface AssignmentImportValidateResultInfo {
  /**
   * Detected source format
   */
  sourceFormat: SourceFormat;

  /**
   * Flag if the assignment has a rubric
   */
  hasRubric: boolean;

  /**
   * Flag if the validation passed
   */
  valid: boolean;


  /**
   * Source distribution format
   */
  distributionFormat: DistributionFormat;
}
