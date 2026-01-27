// service.ts
import * as AssetModel from "./model.ts";
import type { Asset, PaginatedAssets } from "./types.ts";

// Service to create a new asset
export const createAsset = async (
  data: Asset,
): Promise<{ message: string }> => {
  return await AssetModel.create(data);
};

// Service to get all assets with optional filters/pagination
export const getAllAssets = async (
  options: any,
): Promise<PaginatedAssets | Asset[]> => {
  return await AssetModel.findAll(options);
};

// Service to get a single asset by ID
export const getAssetById = async (id: string | number): Promise<Asset> => {
  // Ensure ID is number
  const assetId = typeof id === "string" ? parseInt(id, 10) : id;
  return await AssetModel.findById(assetId);
};

// Service to update an asset
export const updateAsset = async (
  data: Asset & { asset_id: number },
): Promise<{ message: string } | Asset> => {
  return await AssetModel.update(data);
};

// Service to delete an asset
export const deleteAsset = async (
  id: string | number,
): Promise<{ message: string }> => {
  const assetId = typeof id === "string" ? parseInt(id, 10) : id;
  return await AssetModel.remove(assetId);
};
