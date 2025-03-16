import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function initialize() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log('System is already initialized');
      return;
    }

    console.log('Initial system setup');
    console.log('--------------------');
    
    const email = await question('Super Admin Email: ');
    const name = await question('Super Admin Name: ');
    const password = await question('Super Admin Password: ');

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('\nSuper Admin created successfully!');
  } catch (error) {
    console.error('Initialization failed:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

initialize();