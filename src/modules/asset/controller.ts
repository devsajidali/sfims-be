import type { Response } from "express";
import * as assetService from "./service.ts";

import type {
  CreateAssetRequest,
  UpdateAssetRequest,
  GetAllAssetsRequest,
  GetByIdRequest,
  DeleteAssetRequest,
} from "./types.ts";

export const create = async (
  req: CreateAssetRequest,
  res: Response,
): Promise<void> => {
  try {
    const asset = await assetService.createAsset(req.body);
    res.status(201).json(asset);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getAll = async (
  req: GetAllAssetsRequest,
  res: Response,
): Promise<void> => {
  try {
    const assets = await assetService.getAllAssets(req.query);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getById = async (
  req: GetByIdRequest,
  res: Response,
): Promise<void> => {
  try {
    const asset = await assetService.getAssetById(req.query.id);
    res.json(asset);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
};

export const update = async (
  req: UpdateAssetRequest,
  res: Response,
): Promise<void> => {
  try {
    const asset = await assetService.updateAsset(req.body);
    res.json(asset);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const remove = async (
  req: DeleteAssetRequest,
  res: Response,
): Promise<void> => {
  try {
    const response = await assetService.deleteAsset(req.query.asset_id);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
