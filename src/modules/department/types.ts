// CORE TYPES
export interface Department {
  department_id: number;
  department_name: string;
}

// REQUEST PAYLOADS
export interface CreateDepartmentPayload {
  department_name: string;
}

export interface UpdateDepartmentPayload {
  department_id: number;
  department_name: string;
}

export interface DeleteDepartmentPayload {
  department_id: number;
}

// FIND ALL OPTIONS
export interface FindAllDepartmentsOptions {
  page?: string;
  limit?: string;
  search?: string;
}

// PAGINATED RESPONSE
export interface PaginatedDepartments {
  total_records: number;
  page: number;
  limit: number;
  records: Department[];
}
