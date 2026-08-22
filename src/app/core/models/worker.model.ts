export interface WorkerDto {
	id: number;
	dni: string;
	position: string;
	phone: string;
	active: boolean;
	username: string;
	name: string;
	lastName: string;
	email: string;
	roleName: string;
	hasAccessAccount: boolean;
}

export interface WorkerRequestDto {
	position: string;
	dni: string;
	phone: string;
	name: string;
	lastName: string;
	username: string;
	email: string;
	createAccount: boolean;
	password?: string;
	role?: string;
}
