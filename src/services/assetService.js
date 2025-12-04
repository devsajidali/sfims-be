import * as Asset from '../models/assetModel.js';

export const createAsset = async (data) => await Asset.create(data);
export const getAllAssets = async () => await Asset.findAll();
export const getAssetById = async (id) => await Asset.findById(id);
export const updateAsset = async (id, data) => await Asset.update(id, data);
export const deleteAsset = async (id) => await Asset.remove(id);
