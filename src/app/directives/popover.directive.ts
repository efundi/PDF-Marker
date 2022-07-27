import {
  ComponentRef,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  HostListener,
  Input,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import {Overlay, OverlayPositionBuilder, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal, TemplatePortal} from '@angular/cdk/portal';

@Directive({
  selector: '[pdfMarkerPopover]'
})
export class PopoverDirective {


  /**
   * This will be used to show tooltip or not
   * This can be used to show the tooltip conditionally
   */
  @Input()
  showToolTip = true;

  /**
   * If this is specified then specified text will be showin in the tooltip
   */

  @Input('pdfMarkerPopover')
  text?: string;

  /**
   * If this is specified then specified template will be rendered in the tooltip
   */
  @Input()
  pdfMarkerPopoverTemplate: TemplateRef<any>;

  @Input()
  pdfMarkerPopoverContext?: any;

  private _overlayRef: OverlayRef;

  constructor(private _overlay: Overlay,
              private _viewContainerRef: ViewContainerRef,
              private _overlayPositionBuilder: OverlayPositionBuilder,
              private _elementRef: ElementRef) { }

  /**
   * Init life cycle event handler
   */
  ngOnInit() {

    if (!this.showToolTip) {
      return;
    }

    const positionStrategy = this._overlayPositionBuilder
      .flexibleConnectedTo(this._elementRef)
      .withPositions([{
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top',
        offsetY: 5,
      }]);

    this._overlayRef = this._overlay.create({ positionStrategy});

  }

  /**
   * This method will be called whenever mouse enters in the Host element
   * i.e. where this directive is applied
   * This method will show the tooltip by instantiating the McToolTipComponent and attaching to the overlay
   */
  @HostListener('mouseenter')
  show() {
    // attach the component if it has not already attached to the overlay
    if (this._overlayRef && !this._overlayRef.hasAttached()) {
      const view: EmbeddedViewRef<any> = this._overlayRef.attach(new TemplatePortal(this.pdfMarkerPopoverTemplate,  this._viewContainerRef, this.pdfMarkerPopoverContext));
      // tooltipRef.instance.text = this.text;
      // tooltipRef.instance.contentTemplate = this.pdfMarkerPopoverTemplate;
    }
  }

  /**
   * This method will be called when mouse goes out of the host element
   * i.e. where this directive is applied
   * This method will close the tooltip by detaching the overlay from the view
   */
  @HostListener('mouseleave')
  hide() {
    this.closeToolTip();
  }

  /**
   * Destroy lifecycle event handler
   * This method will make sure to close the tooltip
   * It will be needed in case when app is navigating to different page
   * and user is still seeing the tooltip; In that case we do not want to hang around the
   * tooltip after the page [on which tooltip visible] is destroyed
   */
  ngOnDestroy() {
    this.closeToolTip();
  }

  /**
   * This method will close the tooltip by detaching the component from the overlay
   */
  private closeToolTip() {
    if (this._overlayRef) {
      this._overlayRef.detach();
    }
  }
}
