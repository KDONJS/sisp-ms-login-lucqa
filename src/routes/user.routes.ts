import { Router, Request, Response, NextFunction } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// Apply middleware to all routes
router.use((req: Request, res: Response, next: NextFunction) => {
  authMiddleware(req, res, next);
});

// Route handlers remain the same
router.post('/', async (req: Request, res: Response) => {
  await userController.createUser(req, res);
});

router.get('/', async (req: Request, res: Response) => {
  await userController.getUsers(req, res);
});

router.get('/:id', async (req: Request, res: Response) => {
  await userController.getUserById(req, res);
});

router.put('/:id', async (req: Request, res: Response) => {
  await userController.updateUser(req, res);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await userController.deleteUser(req, res);
});

export default router;