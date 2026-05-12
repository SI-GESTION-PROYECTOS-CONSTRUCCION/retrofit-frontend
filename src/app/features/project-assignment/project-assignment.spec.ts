import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAssignment } from './project-assignment';

describe('ProjectAssignment', () => {
  let component: ProjectAssignment;
  let fixture: ComponentFixture<ProjectAssignment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAssignment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectAssignment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
