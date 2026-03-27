// API Spins Route - Updated
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить оставшиеся попытки пользователя
export async function GET(request: NextRequest) {
  try {
    // Получаем email и phone из заголовка
    const userEmail = request.headers.get('x-user-email');
    const userPhone = request.headers.get('x-user-phone') || '';
    
    console.log('GET /api/spins - userEmail:', userEmail, 'phone:', userPhone);

    // Если нет email - возвращаем 0
    if (!userEmail) {
      return NextResponse.json({ spinsLeft: 0, maxSpins: 3, isAdmin: false });
    }

    // Получаем настройку максимальных попыток
    let maxSpins = 3;
    try {
      const maxSpinsSetting = await prisma.settings.findUnique({
        where: { key: 'maxSpins' },
      });
      if (maxSpinsSetting) {
        maxSpins = parseInt(maxSpinsSetting.value);
      }
    } catch {
      // Игнорируем
    }

    // Ищем пользователя по email
    let dbUser = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { email: userEmail.toLowerCase() },
        select: { id: true, role: true, phone: true },
      });
    } catch (err) {
      console.log('User lookup failed:', err);
    }

    // Если пользователь не найден - создаём нового
    if (!dbUser) {
      console.log('User not in DB, creating new user');
      try {
        // Создаём пользователя с ролью user
        dbUser = await prisma.user.create({
          data: {
            email: userEmail.toLowerCase(),
            password: '', // пустой пароль - локальный аккаунт
            name: userEmail.split('@')[0],
            phone: userPhone || null,
            role: 'user',
          },
          select: { id: true, role: true, phone: true },
        });
      } catch (err) {
        console.log('User create failed:', err);
        // Разрешаем спин без трекинга
        return NextResponse.json({ spinsLeft: maxSpins, maxSpins, isAdmin: false });
      }
    } else if (!dbUser.phone && userPhone) {
      // Обновляем телефон если его нет
      try {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { phone: userPhone },
        });
      } catch (err) {
        console.log('Phone update failed:', err);
      }
    }

    // Если админ - возвращаем бесконечные попытки
    if (dbUser.role === 'ADMIN') {
      return NextResponse.json({ spinsLeft: 999999, maxSpins: 999999, isAdmin: true });
    }

    // Получаем или создаем запись о попытках
    let userSpin = null;
    try {
      userSpin = await prisma.userSpin.findFirst({
        where: { userId: dbUser.id },
      });
    } catch (err) {
      console.log('userSpin lookup failed:', err);
    }

    if (!userSpin) {
      try {
        userSpin = await prisma.userSpin.create({
          data: { userId: dbUser.id, spinsLeft: maxSpins },
        });
      } catch (err) {
        console.log('userSpin create failed:', err);
        return NextResponse.json({ spinsLeft: maxSpins, maxSpins, isAdmin: false });
      }
    }

    return NextResponse.json({ 
      spinsLeft: userSpin.spinsLeft, 
      maxSpins,
      isAdmin: false,
    });
  } catch (error) {
    console.error('Get spins error:', error);
    return NextResponse.json({ spinsLeft: 3, maxSpins: 3, isAdmin: false });
  }
}

// POST - использовать одну попытку и записать результат
export async function POST(request: NextRequest) {
  try {
    // Получаем email и phone из заголовка
    const userEmail = request.headers.get('x-user-email');
    const userPhone = request.headers.get('x-user-phone') || '';
    
    console.log('POST /api/spins - userEmail:', userEmail, 'phone:', userPhone);
    
    // Проверяем авторизацию
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Необходимо авторизоваться' },
        { status: 401 }
      );
    }

    // Получаем настройку максимальных попыток
    let maxSpins = 3;
    try {
      const maxSpinsSetting = await prisma.settings.findUnique({
        where: { key: 'maxSpins' },
      });
      if (maxSpinsSetting) {
        maxSpins = parseInt(maxSpinsSetting.value);
      }
    } catch {
      // Игнорируем
    }

    // Ищем пользователя по email
    let dbUser = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { email: userEmail.toLowerCase() },
        select: { id: true, role: true, phone: true },
      });
    } catch (err) {
      console.log('User lookup failed:', err);
    }

    // Если пользователь не найден - создаём нового
    if (!dbUser) {
      console.log('Creating new user from POST');
      try {
        dbUser = await prisma.user.create({
          data: {
            email: userEmail.toLowerCase(),
            password: '',
            name: userEmail.split('@')[0],
            phone: userPhone || null,
            role: 'user',
          },
          select: { id: true, role: true, phone: true },
        });
      } catch (err) {
        console.log('User create failed:', err);
        // Разрешаем спин без трекинга
        return NextResponse.json({ spinsLeft: maxSpins, maxSpins });
      }
    } else if (!dbUser.phone && userPhone) {
      // Обновляем телефон если его нет
      try {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { phone: userPhone },
        });
      } catch (err) {
        console.log('Phone update failed:', err);
      }
    }

    // Если админ - всегда разрешаем
    if (dbUser.role === 'ADMIN') {
      return NextResponse.json({ spinsLeft: 999999, maxSpins: 999999 });
    }

    // Для обычных пользователей - работаем с попытками
    let spinsLeft = maxSpins;
    
    try {
      let userSpin = await prisma.userSpin.findFirst({
        where: { userId: dbUser.id },
      });

      if (!userSpin) {
        userSpin = await prisma.userSpin.create({
          data: { userId: dbUser.id, spinsLeft: maxSpins },
        });
      }

      spinsLeft = userSpin.spinsLeft;

      if (spinsLeft > 0) {
        // Уменьшаем попытки
        await prisma.userSpin.update({
          where: { id: userSpin.id },
          data: { spinsLeft: spinsLeft - 1 },
        });
        spinsLeft = spinsLeft - 1;
      }
    } catch (err) {
      console.log('Spin tracking error:', err);
      // Разрешаем спин без трекинга
    }

    // Записываем в историю
    const body = await request.json();
    const { segmentId } = body;
    
    if (segmentId) {
      try {
        await prisma.spinHistory.create({
          data: { segmentId: segmentId, userId: dbUser.id },
        });
      } catch (err) {
        console.log('History error (ignored):', err);
      }
    }

    return NextResponse.json({ spinsLeft, maxSpins });
  } catch (error) {
    console.error('Use spin error:', error);
    return NextResponse.json(
      { error: 'Ошибка при использовании попытки' },
      { status: 500 }
    );
  }
}

// DELETE - сбросить попытки (для админа)
export async function DELETE(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const session = JSON.parse(sessionCookie.value);
    
    // Проверяем что это админ
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Получаем максимальное количество попыток
    let maxSpins = 3;
    try {
      const maxSpinsSetting = await prisma.settings.findUnique({
        where: { key: 'maxSpins' },
      });
      if (maxSpinsSetting) {
        maxSpins = parseInt(maxSpinsSetting.value);
      }
    } catch {
      // Игнорируем ошибку
    }

    // Сбрасываем попытки всем пользователям
    await prisma.userSpin.updateMany({
      data: { spinsLeft: maxSpins },
    });

    return NextResponse.json({ success: true, message: 'Попытки сброшены' });
  } catch (error) {
    console.error('Reset spins error:', error);
    return NextResponse.json(
      { error: 'Ошибка при сбросе попыток' },
      { status: 500 }
    );
  }
}
