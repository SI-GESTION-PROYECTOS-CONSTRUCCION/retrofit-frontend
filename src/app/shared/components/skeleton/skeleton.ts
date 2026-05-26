import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  imports: [CommonModule],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
  standalone: true
})
export class Skeleton {
  @Input() width = '100%';
  @Input() height = '20px';
  @Input() borderRadius = '6px';
  @Input() marginBottom = '12px';
}
