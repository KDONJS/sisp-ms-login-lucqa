import { PrismaClient, User, Prisma } from '@prisma/client';

// Change from constant to class property
export class UserService {
  private prisma = new PrismaClient();

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async getUsers(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User | null> {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  async deleteUser(id: string): Promise<User | null> {
    return this.prisma.user.delete({
      where: { id }
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }
}