export interface UserDto {
	id: number;
	name: string;
	lastName: string;
	email: string;
	username: string;
	role: string;
	createdAt: Date;
	updatedAt: Date;
	active: boolean;
}

export interface UserCreateDto {
	email: string;
	name: string;
	username: string;
	lastName: string;
	password?: string;
	role: string;
}
