export interface PermissionDto {
	id: number;
	name: string;
}

export interface RoleRequestDto {
	name: string;
	description: string;
	permissionIds: number[];
}

export interface RoleResponseDto {
	id: number;
	name: string;
	description: string;
	permissions: PermissionDto[];
}
