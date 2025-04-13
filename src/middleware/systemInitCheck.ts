import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requireSystemInit = (req: Request, res: Response, next: NextFunction) => {
  prisma.user.count()
    .then(userCount => {
      if (userCount === 0) {
        // System not initialized, redirect to install page
        return res.status(307).json({ 
          message: 'System not initialized', 
          redirectTo: '/install' 
        });
      }
      // System is initialized, proceed
      next();
    })
    .catch(error => {
      console.error('Error checking system initialization:', error);
      return res.status(500).json({ message: 'Server error' });
    });
};

export const preventAccessIfInitialized = (req: Request, res: Response, next: NextFunction) => {
  prisma.user.count()
    .then(userCount => {
      if (userCount > 0) {
        // System already initialized, prevent access to install page
        return res.status(403).json({ 
          message: 'System already initialized', 
          redirectTo: '/login' 
        });
      }
      // System not initialized, allow access to install page
      next();
    })
    .catch(error => {
      console.error('Error checking system initialization:', error);
      return res.status(500).json({ message: 'Server error' });
    });
};