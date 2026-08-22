export interface ProjectAssignmentDto {
	id?: number;
	projectId: number;
	projectName?: string;
	workerId: number;
	workerName?: string;
	position?: string;
	assignedAt?: string | Date;
	active: boolean;
}

export interface AssignmentRequestDto {
	projectId: number;
	workerId: number;
}
