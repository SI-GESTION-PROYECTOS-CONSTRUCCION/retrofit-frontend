import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectProgressListComponent } from './project-progress-list-component';

describe('ProjectProgressListComponent', () => {
  let component: ProjectProgressListComponent;
  let fixture: ComponentFixture<ProjectProgressListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectProgressListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectProgressListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
