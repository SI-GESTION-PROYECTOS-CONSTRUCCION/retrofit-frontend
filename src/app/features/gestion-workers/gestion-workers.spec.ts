import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionWorkers } from './gestion-workers';

describe('GestionWorkers', () => {
  let component: GestionWorkers;
  let fixture: ComponentFixture<GestionWorkers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionWorkers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionWorkers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
