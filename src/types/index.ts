// types.ts

import type { Pool } from "mysql2/promise";

// CSV / XLS parser returns an array of objects with unknown keys
export type ParsedFileRow = Record<string, any>;
export type ParsedFile = ParsedFileRow[];

// Joi error formatter input
export type JoiError = {
  details: { message: string }[];
};

// Options for fetchWithSearchAndPagination
export type FetchOptions = {
  table: string;
  search?: string;
  searchColumn?: string;
  page?: number | string;
  limit?: number | string;
  orderBy?: string;
};

// Result type when pagination is applied
export type FetchResult<T = any> = {
  total_records: number;
  page: number;
  limit: number;
  records: T[];
};

// MySQL pool type
export type MySQLPool = Pool;
