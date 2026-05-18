import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApuModalComponent } from './apu-modal-component';

describe('ApuModalComponent', () => {
  let component: ApuModalComponent;
  let fixture: ComponentFixture<ApuModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApuModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApuModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
