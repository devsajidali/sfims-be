import * as Asset from "../models/assetModel.js";

export const createAsset = async (data) => await Asset.create(data);
export const getAllAssets = async () => await Asset.findAll();
export const getAssetById = async (id) => await Asset.findById(id);
export const updateAsset = async (data) => await Asset.update(data);
export const deleteAsset = async (id, res) => await Asset.remove(id, res);
