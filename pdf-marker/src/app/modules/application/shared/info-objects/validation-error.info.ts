export interface ValidationErrorInfo {
  error: ErrorInfo[]
}

export interface ErrorInfo {
  value: any,
  msg: string;
  param: string;
  location: string
}
