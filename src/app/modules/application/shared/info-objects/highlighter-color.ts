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
  {colour: 'rgba(255, 255, 0, 0.5)', preview: 'rgba(255, 255, 0, 1)'},
  {colour: 'rgba(0, 255, 0, 0.5)', preview: 'rgba(0, 255, 0, 1)'},
  {colour: 'rgba(0, 255, 255, 0.5)', preview: 'rgba(0, 255, 255, 1)'},
  {colour: 'rgba(255, 0, 0, 0.5)', preview: 'rgba(255, 0, 0, 1)'}
];

export const DEFAULT_HIGHLIGHTER = HIGHLIGHTER_OPTIONS[0];
