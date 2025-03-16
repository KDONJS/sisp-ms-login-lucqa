import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const redisClient = createClient({
  url: process.env.REDIS_URL
});

// Connect to Redis
(async () => {
  await redisClient.connect();
})().catch(console.error);

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const storedToken = await redisClient.get(`token:${decoded.userId}`);

    if (!storedToken || storedToken !== token) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};