
export interface MarkCoordinate {
  x?: number;
  y?: number;
  width?: number;
}

export interface MarkInfo {
  coordinates?: MarkCoordinate;
  iconName?: string;
  iconType?: string;
  totalMark?: number;
  colour?: string;
  sectionLabel?: string;
  comment?: string;
}
