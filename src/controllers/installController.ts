import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const getInstallPage = (req: Request, res: Response) => {
  prisma.user.count()
    .then(userCount => {
      if (userCount > 0) {
        return res.status(403).json({ message: 'Sistema ya inicializado' });
      }
      
      // Renderizar la página de instalación
      return res.render('install');
    })
    .catch(error => {
      console.error('Error al verificar el estado del sistema:', error);
      return res.status(500).json({ message: 'Error del servidor' });
    });
};

export const installSystem = (req: Request, res: Response) => {
  try {
    prisma.user.count()
      .then(async userCount => {
        if (userCount > 0) {
          return res.status(403).json({ message: 'System is already initialized' });
        }

        const { email, name, password } = req.body;
        
        // Validate inputs
        if (!email || !name || !password) {
          return res.status(400).json({ message: 'All fields are required' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        return prisma.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            role: 'SUPER_ADMIN'
          }
        })
        .then(() => {
          return res.status(201).json({ 
            message: 'System initialized successfully',
            redirectTo: '/login'
          });
        })
        .catch(error => {
          console.error('Installation failed:', error);
          return res.status(500).json({ message: 'Installation failed' });
        });
      })
      .catch(error => {
        console.error('Installation failed:', error);
        return res.status(500).json({ message: 'Installation failed' });
      });
  } catch (error) {
    console.error('Installation failed:', error);
    return res.status(500).json({ message: 'Installation failed' });
  }
};