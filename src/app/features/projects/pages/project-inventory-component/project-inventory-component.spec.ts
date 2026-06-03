import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectInventoryComponent } from './project-inventory-component';

describe('ProjectInventoryComponent', () => {
  let component: ProjectInventoryComponent;
  let fixture: ComponentFixture<ProjectInventoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectInventoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
