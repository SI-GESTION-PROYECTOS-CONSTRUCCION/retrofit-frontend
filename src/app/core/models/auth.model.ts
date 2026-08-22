export interface UserProfile {
	id: number;
	email: string;
	username: string;
	name: string;
	lastName: string;
	role: string;
	permissions: string[];
	requirePasswordChange: boolean;
}

export interface AuthResponse {
	jwt: string;
	refreshToken: string;
}

export interface LoginCredentials {
	username: string;
	password?: string;
}
