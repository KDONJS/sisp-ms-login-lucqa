import { PrismaClient } from '@prisma/client';
import Redis from 'redis';

export const prisma = new PrismaClient();

export const redis = Redis.createClient({
  url: process.env.REDIS_URL
});

redis.connect().catch(console.error);

prisma.$connect().catch(console.error);

process.on('beforeExit', async () => {
  await redis.disconnect();
  await prisma.$disconnect();
});