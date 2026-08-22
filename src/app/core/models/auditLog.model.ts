export interface AuditLog {
	logId: string;
	timestamp: string;
	userName: string;
	userRole: string;
	action: string;
	module: string;
	description: string;
	ipAddress: string;
	userAgent: string;
	oldData: string;
	newData: string;
}
