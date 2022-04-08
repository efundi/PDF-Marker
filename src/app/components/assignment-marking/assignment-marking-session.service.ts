import {EventEmitter, Injectable, OnDestroy} from '@angular/core';
import {IconInfo} from '../../info-objects/icon.info';
import {isEqual} from 'lodash';
import {DEFAULT_HIGHLIGHTER, HighlighterColor} from '../../info-objects/highlighter-color';


export interface ZoomChangeEvent{
  previous?: number;
  current: number;
}

@Injectable()
export class AssignmentMarkingSessionService implements OnDestroy {


  static readonly DEFAULT_COLOR: string = '#6F327A';

  highlighterColourChanged: EventEmitter<HighlighterColor> = new EventEmitter<HighlighterColor>();
  colourChanged: EventEmitter<string> = new EventEmitter<string>();
  iconChanged: EventEmitter<IconInfo> = new EventEmitter<IconInfo>();
  zoomChanged: EventEmitter<ZoomChangeEvent> = new EventEmitter<ZoomChangeEvent>();

  private _colour = AssignmentMarkingSessionService.DEFAULT_COLOR;
  private _icon: IconInfo;
  private _zoom = 1.0;
  private _highlighterColour: HighlighterColor = DEFAULT_HIGHLIGHTER;


  set highlighterColour(colour: HighlighterColor) {
    if (colour !== this._highlighterColour) {
      this._highlighterColour = colour;
      this.highlighterColourChanged.emit(colour);
    }
  }

  get highlighterColour(): HighlighterColor {
    return this._highlighterColour;
  }

  set zoom(zoom: number) {
    if (zoom !== this._zoom) {
      const previous = this._zoom;
      this._zoom = zoom;
      this.zoomChanged.emit({
        previous,
        current: this._zoom
      });
    }
  }

  get zoom() {
    return this._zoom;
  }

  set colour(colour: string) {
    if (AssignmentMarkingSessionService.isColour(colour)) {
      this._colour = colour;
      this.colourChanged.emit(this._colour);
    }
  }

  get colour(): string {
    return this._colour;
  }


  set icon(icon: IconInfo) {
    const isSame = isEqual(this._icon, icon);
    if (!isSame) {
      this._icon = icon;
      this.iconChanged.emit(this._icon);
    }
  }

  get icon(): IconInfo {
    return this._icon;
  }

  static isColour(colour: string): boolean {
    const style = new Option().style;
    style.color = colour;
    return style.color !== '';
  }


  constructor() { }

  ngOnDestroy() {
    this.colourChanged.complete();
    this.colourChanged.unsubscribe();

    this.iconChanged.complete();
    this.iconChanged.unsubscribe();

    this.zoomChanged.complete();
    this.zoomChanged.unsubscribe();

    this.highlighterColourChanged.complete();
    this.highlighterColourChanged.unsubscribe();
  }
}
