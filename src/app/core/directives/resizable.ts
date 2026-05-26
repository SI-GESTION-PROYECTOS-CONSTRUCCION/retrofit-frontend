import { Directive, ElementRef, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appResizable]',
  standalone: true
})
export class Resizable {
  private resizer!: HTMLElement;
  private startX!: number;
  private startWidth!: number;

  private mouseMoveListener!: () => void;
  private mouseUpListener!: () => void;

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnInit() {
    this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');

    this.resizer = this.renderer.createElement('div');
    this.renderer.addClass(this.resizer, 'resize-handle');
    this.renderer.appendChild(this.el.nativeElement, this.resizer);

    this.renderer.listen(this.resizer, 'mousedown', (event: MouseEvent) => {
      this.startX = event.pageX;
      this.startWidth = this.el.nativeElement.offsetWidth;

      event.preventDefault();

      this.mouseMoveListener = this.renderer.listen('document', 'mousemove', this.onMouseMove.bind(this));
      this.mouseUpListener = this.renderer.listen('document', 'mouseup', this.onMouseUp.bind(this));
    });
  }

  private onMouseMove(event: MouseEvent) {
    const newWidth = this.startWidth + (event.pageX - this.startX);

    this.renderer.setStyle(this.el.nativeElement, 'width', `${newWidth}px`);
    this.renderer.setStyle(this.el.nativeElement, 'min-width', `${newWidth}px`);
  }

  private onMouseUp() {
    if (this.mouseMoveListener) this.mouseMoveListener();
    if (this.mouseUpListener) this.mouseUpListener();
  }
}
