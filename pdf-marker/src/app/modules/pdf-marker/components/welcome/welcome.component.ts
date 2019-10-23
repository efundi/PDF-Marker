import {
  Component,
  ComponentFactoryResolver,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
  ViewContainerRef,
  ComponentFactory
} from '@angular/core';
import {MarkTypeIconComponent} from "@pdfMarkerModule/components/mark-type-icon/mark-type-icon.component";

@Component({
  selector: 'pdf-marker-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {

  @ViewChild('container', {static: false})
  container: ElementRef;

  private minWidth: number;
  private minHeight: number;

  @ViewChild('containerRef', {read: ViewContainerRef, static: false})
  actualContainer: ViewContainerRef;

  private selectedIcon: string;
  constructor(private renderer: Renderer2,
              private el: ElementRef,
              private resolver: ComponentFactoryResolver) { }

  ngOnInit() {
    /*this.minWidth = this.container.nativeElement.offsetWidth;
    this.minHeight = this.container.nativeElement.offsetHeight;*/
  }

  onSelectedIcon(selectedIcon: string) {
    this.selectedIcon = selectedIcon;
    if(this.selectedIcon) {
      console.log("Selected Icon is ", selectedIcon);
      this.renderer.addClass(this.container.nativeElement, 'pdf-marker-dropzone');
    } else {
      console.log('None selected');
      this.renderer.removeClass(this.container.nativeElement, 'pdf-marker-dropzone');
    }
  }

  onDropClick(event) {
    console.log(event);
    if(this.selectedIcon) {
      const factory: ComponentFactory<MarkTypeIconComponent> = this.resolver.resolveComponentFactory(MarkTypeIconComponent);
      const componentRef = this.actualContainer.createComponent(factory);
      componentRef.instance.iconName = this.selectedIcon;
      componentRef.instance.setComponentRef(componentRef);
      this.renderer.setStyle(componentRef.location.nativeElement, 'position', 'absolute');

      const minWidth = this.container.nativeElement.scrollWidth - 36;
      const minHeight = this.container.nativeElement.scrollHeight - 36;

      const top = event.offsetY - 18;
      const left = event.offsetX - 18;

      console.log(minHeight);
      console.log(minWidth);
      console.log(this.container.nativeElement.scrollHeight);
      console.log(this.container.nativeElement.scrollWidth);
      console.log('Top: ' + top);
      console.log('Left: ' + left);

      this.renderer.setStyle(componentRef.location.nativeElement, 'top', ((top < 0) ? 0:((top > minHeight) ? minHeight:top)) + 'px');
      this.renderer.setStyle(componentRef.location.nativeElement, 'left', ((left < 0) ? 0:((left > minWidth) ? minWidth:left)) + 'px');
    }
  }

}
