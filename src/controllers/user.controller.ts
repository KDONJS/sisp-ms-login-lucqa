import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { Role, Prisma } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import bcrypt from 'bcrypt';
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
      
      // Hash the password before saving
      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash(req.body.password, 10);
        logger.debug('Password hashed successfully');
      } catch (hashError) {
        logger.error('Password hashing error:', hashError);
        return res.status(500).json({ 
          message: 'Error processing password',
          details: hashError instanceof Error ? hashError.message : 'Unknown error'
        });
      }
      
      const userData = {
        ...req.body,
        password: hashedPassword, // Use the hashed password
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

  // PATCH /users/:id
  async updateUser(req: Request & { file?: Express.Multer.File }, res: Response) {
    const userId = req.params.id;
    try {
      logger.info(`UpdateUser iniciado para ID: ${userId}`);
      logger.debug('Request body:', req.body, 'Has file:', !!req.file);

      // 1) Preparamos el objeto de actualización
      const updateData: Prisma.UserUpdateInput = {};
      const { password, status, ...otros } = req.body;

      if (status !== undefined) {
        updateData.status = Boolean(status);
      }
      Object.assign(updateData, otros);

      // 2) Si viene nueva contraseña, la hasheamos
      if (password) {
        try {
          updateData.password = await bcrypt.hash(password, 10);
          logger.debug('Contraseña hasheada correctamente');
        } catch (err) {
          logger.error('Error al hashear contraseña:', err);
          return res.status(500).json({
            message: 'Error procesando contraseña',
            details: err instanceof Error ? err.message : String(err)
          });
        }
      }

      // 3) Si llega imagen, validamos y subimos a S3
      if (req.file) {
        const mime = req.file.mimetype;
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(mime)) {
          logger.warn(`Tipo de archivo inválido: ${mime}`);
          return res.status(400).json({ message: 'Tipo de archivo inválido. Sólo JPG/PNG.' });
        }

        const fileName = `users/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: mime
        };

        try {
          logger.info(`Subiendo imagen de perfil a S3 para usuario ${userId}…`);
          await s3Client.send(new PutObjectCommand(uploadParams));
          const imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
          updateData.imageUrl = imageUrl;
          logger.info(`Imagen subida correctamente: ${imageUrl}`);
        } catch (uploadErr: any) {
          logger.error('Error subiendo imagen a S3:', uploadErr);
          return res.status(500).json({
            message: 'Error subiendo imagen',
            details: uploadErr.message || String(uploadErr)
          });
        }
      }

      // 4) Ejecutamos la actualización en base de datos
      const updated = await userService.updateUser(userId, updateData);
      if (!updated) {
        logger.warn(`Usuario no encontrado: ${userId}`);
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      logger.info(`Usuario actualizado con éxito: ${updated.id}`);
      res.json(updated);

    } catch (err) {
      logger.error('Error en updateUser:', err);
      res.status(500).json({
        message: 'Error actualizando usuario',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // PATCH /users/:id/photo
  async updateUserPhoto(req: Request & { file?: Express.Multer.File }, res: Response) {
    try {
      logger.info(`UpdateUserPhoto iniciado para ID: ${req.params.id}`);

      if (!req.file) {
        return res.status(400).json({ message: 'No se envió ninguna imagen' });
      }
      const mime = req.file.mimetype;
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(mime)) {
        return res.status(400).json({ message: 'Tipo de archivo inválido. Sólo JPG/PNG.' });
      }

      const fileName = `users/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: mime
      }));
      const imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      const user = await userService.updateUser(req.params.id, { imageUrl });
      if (!user) {
        logger.warn(`Usuario no encontrado: ${req.params.id}`);
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      logger.info(`Foto de usuario actualizada con éxito: ${user.id}`);
      res.json(user);

    } catch (error) {
      logger.error('Error en updateUserPhoto:', error);
      res.status(500).json({
        message: 'Error actualizando foto',
        details: error instanceof Error ? error.message : String(error)
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