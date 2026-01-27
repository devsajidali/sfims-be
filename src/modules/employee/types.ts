export interface Employee {
  employee_id?: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  designation?: string;
  role?: string;
  email: string;
  contact_number?: string;
  department_id?: number;
  team_id?: number | null;
  project_ids?: number[];
  project_names?: string[];
  group?: string[]; // e.g., ["Department", "Team"]
  team?: Team | null;
}

export interface Team {
  team_id: number;
  team_name: string;
}

export interface Department {
  department_id: number;
  department_name: string;
}

export interface Pagination {
  page?: number | null;
  limit?: number | null;
}

export interface BulkUploadResult {
  total_rows: number;
  inserted: number;
  errors: { row: number; error: string }[];
}

export interface ServiceResponse<T = any> {
  title?: string;
  message?: string;
  records?: T[];
  total_records?: number;
  [key: string]: any;
}

export interface File {
  mimetype: string;
  buffer: Buffer;
  originalname: string;
}
