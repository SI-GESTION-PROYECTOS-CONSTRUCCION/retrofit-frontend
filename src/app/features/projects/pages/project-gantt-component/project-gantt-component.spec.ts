import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectGantComponent } from './project-gant-component';

describe('ProjectGantComponent', () => {
  let component: ProjectGantComponent;
  let fixture: ComponentFixture<ProjectGantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectGantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectGantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
