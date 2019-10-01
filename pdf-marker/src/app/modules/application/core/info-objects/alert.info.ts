export class AlertInfo {
  type: AlertInfoType;
  message: string;
  alertId: string;
  keepAfterRouteChange: boolean;

  constructor(init?:Partial<AlertInfo>) {
    Object.assign(this, init);
  }
}

export enum AlertInfoType {
  Success,
  Error,
  Info,
  Warning
}
