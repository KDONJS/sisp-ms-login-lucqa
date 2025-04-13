import express, { RequestHandler } from 'express';
import { getInstallPage, installSystem } from '../controllers/installController';
import { preventAccessIfInitialized } from '../middleware/systemInitCheck';

const router = express.Router();

// Apply middleware to prevent access if already initialized
router.use(preventAccessIfInitialized);

// GET installation page
router.get('/', getInstallPage as RequestHandler);

// POST to initialize the system
router.post('/', installSystem as RequestHandler);

export default router;