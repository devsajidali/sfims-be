import express from 'express';
import * as assignmentController from '../controllers/assignmentController.js';

const router = express.Router();

router.post('/', assignmentController.create);
router.get('/', assignmentController.getAll);
router.get('/:id', assignmentController.getById);
router.put('/:id', assignmentController.update);
router.delete('/:id', assignmentController.remove);

export default router;
