import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Создаем настройку максимальных попыток
  const existing = await prisma.settings.findUnique({
    where: { key: 'maxSpins' }
  });
  
  if (!existing) {
    await prisma.settings.create({
      data: {
        key: 'maxSpins',
        value: '3',
      }
    });
    console.log('Created maxSpins setting with value 3');
  } else {
    console.log('maxSpins setting already exists:', existing.value);
  }
  
  // Даем всем пользователям попытки
  const users = await prisma.user.findMany();
  for (const user of users) {
    const existingSpin = await prisma.userSpin.findFirst({
      where: { userId: user.id }
    });
    
    if (!existingSpin) {
      await prisma.userSpin.create({
        data: {
          userId: user.id,
          spinsLeft: 3,
        }
      });
      console.log(`Created spins for user ${user.email}`);
    } else {
      console.log(`User ${user.email} already has ${existingSpin.spinsLeft} spins`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
