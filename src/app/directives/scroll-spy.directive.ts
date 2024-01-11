import {
  Directive,
  Input,
  EventEmitter,
  Output,
  ElementRef,
  Renderer2,
  OnDestroy,
  OnChanges, SimpleChanges
} from '@angular/core';

import {isNil} from 'lodash';

@Directive({
  selector: '[scrollSpy]'
})
export class ScrollSpyDirective implements OnDestroy, OnChanges {

  @Input()
  scrollTarget = 'mat-sidenav-content';

  @Input()
  spiedTags = [];

  @Output()
  sectionChange = new EventEmitter<string>();

  private currentSection: string;

  private unlisten;

  constructor(private _el: ElementRef,
              private renderer: Renderer2) {
  }


  ngOnChanges(changes: SimpleChanges) {
    if (changes.hasOwnProperty('scrollTarget')) {
      if (!isNil(this.unlisten)) {
        this.unlisten();
        this.unlisten = null;
      }

      if (!isNil(changes['scrollTarget'].currentValue)) {
        // Scrolling happens on the mat-sidenav-content component
        const container = document.querySelector(changes['scrollTarget'].currentValue);
        this.unlisten = this.renderer.listen(container, 'scroll', (e) => {
          this.onScroll(e);
        });
      }
    }
  }

  private onScroll(event: any) {
    let currentSection: string;
    const children = this._el.nativeElement.children;
    const scrollTop = event.target.scrollTop;
    const parentOffset = event.target.offsetTop;
    for (let i = 0; i < children.length; i++) {
      const element = children[i];
      if (this.spiedTags.some(spiedTag => spiedTag === element.tagName)) {
        // If any of the spied tags is the next child

        if ((element.offsetTop - parentOffset) <= scrollTop) {
          // If the element is at the top of the scroll container
          currentSection = element.id;
        }
      }
    }
    if (currentSection !== this.currentSection) {
      this.currentSection = currentSection;
      this.sectionChange.emit(this.currentSection);
    }
  }

  ngOnDestroy() {
    this.unlisten();
  }
}
