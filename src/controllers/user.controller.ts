import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { Role, Shift, Prisma } from '@prisma/client';

const userService = new UserService();

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: Role;
  position?: string;
  department?: string;
  shift?: Shift;
  status: boolean;
}

export class UserController {
  async createUser(req: Request<{}, {}, CreateUserRequest>, res: Response) {
    try {
      const userData = {
        ...req.body,
        status: req.body.status ?? true,
        lastLogin: null
      };

      const user = await userService.createUser(userData);
      
      const { password, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Error creating user' });
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

  async updateUser(req: Request, res: Response) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error updating user' });
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