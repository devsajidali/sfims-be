import * as assetService from "../services/assetService.js";

export const create = async (req, res) => {
  try {
    const asset = await assetService.createAsset(req.body);
    res.status(201).json(asset);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const assets = await assetService.getAllAssets(req.query);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const asset = await assetService.getAssetById(req.query.id);
    res.json(asset);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const asset = await assetService.updateAsset(req.body);
    res.json(asset);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const response = await assetService.deleteAsset(req.query.asset_id, res);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
