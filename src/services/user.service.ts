import { PrismaClient, User, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class UserService {
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async getUsers(): Promise<User[]> {
    return prisma.user.findMany();
  }

  async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User | null> {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  async deleteUser(id: string): Promise<User | null> {
    return prisma.user.delete({
      where: { id }
    });
  }
}