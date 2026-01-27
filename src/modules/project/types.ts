
// CORE TYPES
export interface Project {
  project_id: number;
  project_name: string;
}


// REQUEST PAYLOADS
export interface CreateProjectPayload {
  project_name: string;
}

export interface UpdateProjectPayload {
  project_id: number;
  project_name: string;
}


// FIND ALL OPTIONS
export interface FindAllProjectsOptions {
  page?: string;
  limit?: string;
  search?: string;
}


// PAGINATED RESPONSE
export interface PaginatedProjects {
  total_records: number;
  page: number;
  limit: number;
  records: Project[];
}
