import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

// Define a custom interface to extend Request
export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('Authentication failed: No authorization header');
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    
    // Check if it starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Invalid authorization format');
      res.status(401).json({ message: 'Invalid authorization format' });
      return;
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      logger.warn('Authentication failed: No token provided');
      res.status(401).json({ message: 'No token provided' });
      return;
    }
    
    // Log token for debugging (remove in production)
    logger.debug('Processing token:', token.substring(0, 20) + '...');
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      
      // Add user info to request object
      (req as AuthRequest).user = decoded;
      
      logger.info(`User authenticated: ${(decoded as any).email || 'Unknown'}`);
      next();
    } catch (error) {
      logger.warn('Token verification failed:', error);
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};