import express from 'express';
import * as assetController from '../controllers/assetController.js';

const router = express.Router();

router.get('/', assetController.getAll);
router.get('/asset', assetController.getById);

router.post('/asset', assetController.create);
router.put('/asset', assetController.update);
router.delete('/asset', assetController.remove);

export default router;
