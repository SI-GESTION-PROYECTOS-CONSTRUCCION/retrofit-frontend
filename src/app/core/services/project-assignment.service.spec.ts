import { TestBed } from '@angular/core/testing';

import { ProjectAssignmentService } from './project-assignment.service';

describe('ProjectAssignmentService', () => {
  let service: ProjectAssignmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectAssignmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
