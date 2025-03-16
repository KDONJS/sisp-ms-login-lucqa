import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';

export class AuthController {
  private userService = new UserService();
  
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        logger.warn('Login attempt with missing credentials');
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const user = await this.userService.getUserByEmail(email);
      
      if (!user) {
        logger.warn(`Login attempt with non-existent email: ${email}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        logger.warn(`Invalid password attempt for user: ${email}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Update last login
      await this.userService.updateUser(user.id, { lastLogin: new Date() });
      
      // Generate tokens
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
      
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      logger.info(`User logged in successfully: ${email}`);
      
      return res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      return res.status(500).json({ 
        message: 'Error during login',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        logger.warn('Refresh token attempt without token');
        return res.status(400).json({ message: 'Refresh token is required' });
      }
      
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { id: string };
        const user = await this.userService.getUserById(decoded.id);
        
        if (!user) {
          logger.warn(`Refresh token attempt for non-existent user ID: ${decoded.id}`);
          return res.status(401).json({ message: 'Invalid token' });
        }
        
        const accessToken = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET!,
          { expiresIn: '1h' }
        );
        
        logger.info(`Token refreshed successfully for user: ${user.email}`);
        
        return res.status(200).json({ accessToken });
      } catch (error) {
        logger.warn('Invalid refresh token');
        return res.status(401).json({ message: 'Invalid token' });
      }
    } catch (error) {
      logger.error('Refresh token error:', error);
      return res.status(500).json({ 
        message: 'Error refreshing token',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  async getMe(req: Request, res: Response) {
    try {
      logger.info('Getting authenticated user data');
      
      // El usuario ya está disponible en req.user gracias al middleware de autenticación
      const userId = (req as any).user.id;
      
      if (!userId) {
        logger.warn('User ID not found in token');
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = await this.userService.getUserById(userId);
      
      if (!user) {
        logger.warn(`User not found with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Excluir la contraseña de la respuesta
      const { password, ...userWithoutPassword } = user;
      
      logger.info(`User data retrieved successfully for ID: ${userId}`);
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      logger.error('Error getting authenticated user:', error);
      return res.status(500).json({ 
        message: 'Error getting user data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}