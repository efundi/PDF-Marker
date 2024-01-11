import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2, SimpleChanges
} from '@angular/core';

import {isNil} from 'lodash';
import {fromEvent, Observable, Subscription} from 'rxjs';

@Directive({
  selector: '[scrollVisibility]'
})
export class ScrollVisibilityDirective implements OnInit, OnDestroy, OnChanges {

  /**
   * Target in which the element we are checking visiblity is scrolling in
   */
  @Input()
  scrollTarget = 'mat-sidenav-content';

  /**
   * Number of pixles that must be visible to be considered visible on page
   */
  @Input()
  targetVisibility = 50;

  @Output()
  visibilityChanged = new EventEmitter<boolean>();

  private visible = null;

  private unlisten;
  private container: HTMLElement;
  private resizeObservable$: Observable<Event>;
  private resizeSubscription$: Subscription;

  constructor(private _el: ElementRef,
              private renderer: Renderer2) {
  }

  ngOnInit() {
    this.resizeObservable$ = fromEvent(window, 'resize');
    this.resizeSubscription$ = this.resizeObservable$.subscribe( () => {
      this.checkVisibility();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.hasOwnProperty('scrollTarget')) {
      if (!isNil(this.unlisten)) {
        this.unlisten();
        this.unlisten = null;
      }

      if (!isNil(changes['scrollTarget'].currentValue)) {
        // Scrolling happens on the mat-sidenav-content component
        this.container = document.querySelector(changes['scrollTarget'].currentValue);
        this.unlisten = this.renderer.listen(this.container, 'scroll', () => {
          this.checkVisibility();
        });
      }
    }
  }

  resetVisibility() {
    this.visible = null;
    this.checkVisibility();
  }

  /**
   * We want to determine the percentage of the viewable screen that is filled by the page
   */
  private checkVisibility() {

    // Element we are tracking visibility of
    const element = this._el.nativeElement;

    // Height of the element
    const elementHeight = element.clientHeight;

    // Offset of the element
    const elementOffset = element.offsetTop;

    // Current amount of scroll on the scrolling container
    const scrollTop = this.container.scrollTop;

    // Height of the scroll container
    const viewHeight = this.container.clientHeight;

    // Offset of the container
    const viewOffsetTop = this.container.offsetTop;

    // Distance the element is from the top of the view for the current scroll
    const distanceFromViewTop = elementOffset - scrollTop - viewOffsetTop;

    // Amount of pixels visible of the element
    let visible = Math.min(viewHeight - distanceFromViewTop, elementHeight);

    // If distance from the top of the view is < 0 it means less of the page is visible
    if (distanceFromViewTop < 0) {
      visible += distanceFromViewTop;
    }

    this.onVisibility(visible >= this.targetVisibility);
  }

  private onVisibility(visible: boolean) {
    if (visible) {
      if (this.visible !== true) { // Using not true, because it might be null
        // If the visible pixels is enough for the target
        this.visible = true;
        this.visibilityChanged.emit(this.visible);
      }
    }
    // If we want to implement keeping track when it becomes invisible, keep in mind the effect of all the events
    /* else if (this.visible !== false) { // Using not false, because it might be null
      this.visible = false;
      this.visibilityChanged.emit(this.visible);

    }*/
  }

  ngOnDestroy() {
    this.unlisten();
    this.resizeSubscription$.unsubscribe();
  }
}
