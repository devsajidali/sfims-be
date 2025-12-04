import express from 'express';
import * as assetController from '../controllers/assetController.js';

const router = express.Router();

router.post('/', assetController.create);
router.get('/', assetController.getAll);
router.get('/:id', assetController.getById);
router.put('/:id', assetController.update);
router.delete('/:id', assetController.remove);

export default router;
