import { Router, Request, Response, NextFunction } from 'express';
import { UserController } from '../controllers/user.controller';
import { handleFileUpload, debugRequest } from '../middleware/upload.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const userCtrl = new UserController();
const userController = new UserController();

// Create user
router.post('/', 
  authMiddleware,
  handleFileUpload('image'),
  (req: Request, res: Response, next: NextFunction) => {
    console.log('📂 Después del middleware de multer:', {
      hasFile: !!req.file,
      fileDetails: req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null,
      bodyKeys: Object.keys(req.body || {})
    });
    Promise.resolve(userController.createUser(req, res)).catch(next);
  }
);

// Get all users
router.get('/', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(userController.getUsers(req, res)).catch(next);
});

// Get user by ID
router.get('/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(userController.getUserById(req, res)).catch(next);
});

// Update user
router.put(
  '/:id',
  authMiddleware,
  debugRequest,
  handleFileUpload('image'),      // <- Multer aquí
  (req, res, next) => {
    Promise.resolve(userCtrl.updateUser(req as any, res)).catch(next);
  }
);

// Update user photo only
router.patch('/:id/photo', 
  authMiddleware,
  debugRequest,
  handleFileUpload('image'),
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(userController.updateUserPhoto(req, res)).catch(next);
  }
);

// Delete user
router.delete('/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(userController.deleteUser(req, res)).catch(next);
});

export default router;