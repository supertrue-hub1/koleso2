import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  const email = 'admin@admin.com';
  const password = 'admin123';
  
  const existing = await db.user.findUnique({
    where: { email },
  });
  
  if (existing) {
    console.log('Admin already exists');
    console.log('Email:', email);
    console.log('Password:', password);
    return;
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Admin',
      role: 'admin',
    },
  });
  
  console.log('Admin created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
}

createAdmin()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
