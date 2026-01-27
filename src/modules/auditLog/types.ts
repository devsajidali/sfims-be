export interface AuditLog {
  log_id: number;
  action: string;
  user_id: number;
  details?: string | null;
  timestamp: string; // Or Date if you convert it
}

export interface MessageResponse {
  message: string;
}
