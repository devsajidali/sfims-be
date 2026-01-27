// types.ts
import { Request } from "express";

// Asset type representing an asset record
export interface Asset {
  asset_id?: number;
  asset_type: string;
  brand?: string | null;
  model?: string | null;
  specifications?: string | null;
  serial_number: string;
  purchase_date?: string | null; // ISO date string
  vendor?: string | null;
  warranty_expiry?: string | null; // ISO date string
  status?: "Available" | "Requested" | "Assigned" | "Repair" | "Retired";
  quantity?: number;
}

// Request bodies

// Body for creating a new asset
export type CreateAssetBody = Asset;

// Body for updating an asset
export interface UpdateAssetBody extends Asset {
  asset_id: number; // required for update
}

// Query parameters for fetching all assets with pagination/search
export interface GetAllAssetsQuery {
  page?: string;
  limit?: string;
  search?: string;
  employee_id?: string;
}

// Query parameters for fetching a single asset by ID
export interface GetByIdQuery {
  id: string;
}

// Query parameters for deleting an asset
export interface DeleteAssetQuery {
  asset_id: string;
}

// Express Request types

// Request type for creating an asset
export type CreateAssetRequest = Request<{}, {}, CreateAssetBody>;

// Request type for updating an asset
export type UpdateAssetRequest = Request<{}, {}, UpdateAssetBody>;

// Request type for getting all assets
export type GetAllAssetsRequest = Request<{}, {}, {}, GetAllAssetsQuery>;

// Request type for getting asset by ID
export type GetByIdRequest = Request<{}, {}, {}, GetByIdQuery>;

// Request type for deleting an asset
export type DeleteAssetRequest = Request<{}, {}, {}, DeleteAssetQuery>;

// Pagination result type

// Result type for paginated asset queries
export interface PaginatedAssets {
  total_records: number;
  page: number;
  limit: number;
  records: Asset[];
}
