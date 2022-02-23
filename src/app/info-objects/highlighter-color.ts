export interface HighlighterColor {
  /**
   * Actual color with alpha
   */
  colour: string;

  /**
   * Preview of the colour without alpha
   */
  preview: string;
}


export const HIGHLIGHTER_OPTIONS: HighlighterColor[] = [
  {colour: 'rgba(255, 255, 0, 0.5)', preview: 'rgb(255, 255, 0)'},
  {colour: 'rgba(0, 255, 0, 0.5)', preview: 'rgb(0, 255, 0)'},
  {colour: 'rgba(0, 255, 255, 0.5)', preview: 'rgb(0, 255, 255)'},
  {colour: 'rgba(255, 0, 0, 0.5)', preview: 'rgb(255, 0, 0)'}
];

export const DEFAULT_HIGHLIGHTER = HIGHLIGHTER_OPTIONS[0];
