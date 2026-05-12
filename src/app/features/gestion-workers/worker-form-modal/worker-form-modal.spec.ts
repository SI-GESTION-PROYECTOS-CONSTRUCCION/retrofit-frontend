import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkerFormModal } from './worker-form-modal';

describe('WorkerFormModal', () => {
  let component: WorkerFormModal;
  let fixture: ComponentFixture<WorkerFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkerFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkerFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
