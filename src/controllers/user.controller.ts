import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { Role, Prisma } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from '../utils/logger';

const userService = new UserService();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

logger.info('AWS Config:', {
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET,
  accessKey: process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Not present',
  secretKey: process.env.AWS_SECRET_ACCESS_KEY ? 'Present' : 'Not present'
});

interface CreateUserRequest extends Request {
  file?: Express.Multer.File;
  body: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: Role;
    position?: string;
    department?: string;
    shift?: 'MORNING' | 'AFTERNOON' | 'NIGHT';
    status: boolean;
  }
}

export class UserController {
  async createUser(req: CreateUserRequest, res: Response) {
    try {
      logger.info(`CreateUser started for email: ${req.body.email}`);
      logger.debug('CreateUser request details:', { 
        body: req.body, 
        hasFile: !!req.file 
      });
      
      const userData = {
        ...req.body,
        status: Boolean(req.body.status),
        lastLogin: null,
        imageUrl: undefined as string | undefined
      };

      if (req.file) {
        try {
          logger.info(`Processing file: ${req.file.originalname}`);
          
          if (!['image/jpeg', 'image/png', 'image/jpg'].includes(req.file.mimetype)) {
            logger.warn(`Invalid file type: ${req.file.mimetype}`);
            return res.status(400).json({ message: 'Invalid file type. Only JPG and PNG allowed.' });
          }

          const fileName = `users/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          logger.debug(`Generated filename: ${fileName}`);

          const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
          };

          logger.info('Starting S3 upload...');
          await s3Client.send(new PutObjectCommand(uploadParams));

          userData.imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
          logger.info(`Image uploaded successfully: ${userData.imageUrl}`);
        } catch (uploadError: any) {
          logger.error('S3 upload error:', uploadError);
          return res.status(500).json({ 
            message: 'Error uploading image',
            details: uploadError.message || 'Unknown error'
          });
        }
      }

      try {
        logger.info('Creating user in database...');
        const user = await userService.createUser(userData);
        const { password, ...userResponse } = user;
        logger.info(`User created successfully with ID: ${user.id}`);
        res.status(201).json(userResponse);
      } catch (error) {
        // Handle database errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            // Check if the error is related to email uniqueness
            const target = error.meta?.target;
            const isEmailError = Array.isArray(target) && target.includes('email');
            
            if (isEmailError) {
              logger.warn(`Attempt to create user with existing email: ${req.body.email}`);
              return res.status(400).json({ message: 'Email already exists' });
            }
          }
        }
        throw error; // Re-throw other errors to be caught by outer catch
      }
    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({ 
        message: 'Error creating user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getUsers(req: Request, res: Response) {
    try {
      const users = await userService.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users' });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user' });
    }
  }

  async updateUser(req: Request & { file?: Express.Multer.File }, res: Response) {
    try {
      logger.info(`UpdateUser started for ID: ${req.params.id}`);
      logger.debug('UpdateUser request details:', { 
        body: req.body, 
        hasFile: !!req.file 
      });
      
      const userData = {
        ...req.body
      };

      // Handle file upload if present
      if (req.file) {
        try {
          logger.info(`Processing file: ${req.file.originalname}`);
          
          if (!['image/jpeg', 'image/png', 'image/jpg'].includes(req.file.mimetype)) {
            logger.warn(`Invalid file type: ${req.file.mimetype}`);
            return res.status(400).json({ message: 'Invalid file type. Only JPG and PNG allowed.' });
          }

          const fileName = `users/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          logger.debug(`Generated filename: ${fileName}`);

          const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
          };

          logger.info('Starting S3 upload...');
          await s3Client.send(new PutObjectCommand(uploadParams));

          userData.imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
          logger.info(`Image uploaded successfully: ${userData.imageUrl}`);
        } catch (uploadError: any) {
          logger.error('S3 upload error:', uploadError);
          return res.status(500).json({ 
            message: 'Error uploading image',
            details: uploadError.message || 'Unknown error'
          });
        }
      }

      const user = await userService.updateUser(req.params.id, userData);
      if (!user) {
        logger.warn(`User not found with ID: ${req.params.id}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      logger.info(`User updated successfully with ID: ${user.id}`);
      res.json(user);
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({ 
        message: 'Error updating user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // New method to update only the user's photo
  async updateUserPhoto(req: Request & { file?: Express.Multer.File }, res: Response) {
    try {
      logger.info(`UpdateUserPhoto started for ID: ${req.params.id}`);
      
      if (!req.file) {
        logger.warn('No file provided for photo update');
        return res.status(400).json({ message: 'No image file provided' });
      }
      
      logger.info(`Processing file: ${req.file.originalname}`);
      
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(req.file.mimetype)) {
        logger.warn(`Invalid file type: ${req.file.mimetype}`);
        return res.status(400).json({ message: 'Invalid file type. Only JPG and PNG allowed.' });
      }

      const fileName = `users/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      logger.debug(`Generated filename: ${fileName}`);

      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      logger.info('Starting S3 upload...');
      await s3Client.send(new PutObjectCommand(uploadParams));

      const imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      logger.info(`Image uploaded successfully: ${imageUrl}`);
      
      const user = await userService.updateUser(req.params.id, { imageUrl });
      if (!user) {
        logger.warn(`User not found with ID: ${req.params.id}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      logger.info(`User photo updated successfully for ID: ${user.id}`);
      res.json(user);
    } catch (error) {
      logger.error('Update user photo error:', error);
      res.status(500).json({ 
        message: 'Error updating user photo',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const result = await userService.deleteUser(req.params.id);
      if (!result) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting user' });
    }
  }
}