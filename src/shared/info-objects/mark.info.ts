
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
  pageNumber?: number;
  sectionLabel?: string;
  comment?: string;
}
