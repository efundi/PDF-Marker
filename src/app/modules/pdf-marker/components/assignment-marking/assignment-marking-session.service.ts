import {EventEmitter, Injectable, OnDestroy} from '@angular/core';
import {IconInfo} from '@pdfMarkerModule/info-objects/icon.info';
import {isEqual} from 'lodash';

@Injectable()
export class AssignmentMarkingSessionService implements OnDestroy {


  static readonly DEFAULT_COLOR: string = '#6F327A';

  colourChanged: EventEmitter<string> = new EventEmitter<string>();
  iconChanged: EventEmitter<IconInfo> = new EventEmitter<IconInfo>();
  zoomChanged: EventEmitter<number> = new EventEmitter<number>();

  private _colour = AssignmentMarkingSessionService.DEFAULT_COLOR;
  private _icon: IconInfo;
  private _zoom = 1.0;

  set zoom(zoom: number) {
    if (zoom !== this._zoom) {
      this._zoom = zoom;
      this.zoomChanged.emit(zoom);
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
  }
}
