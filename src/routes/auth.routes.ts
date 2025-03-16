import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Rutas existentes
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(authController.login(req, res)).catch(next);
});

router.post('/refresh', (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(authController.refreshToken(req, res)).catch(next);
});

// Nueva ruta para obtener datos del usuario autenticado
router.get('/me', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(authController.getMe(req, res)).catch(next);
});

export default router;