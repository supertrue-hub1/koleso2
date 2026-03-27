// API Spins Route - Updated
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить оставшиеся попытки пользователя
export async function GET(request: NextRequest) {
  try {
    // Пробуем получить из заголовка (как в POST)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    console.log('GET /api/spins - userId:', userId, 'role:', userRole);

    // Если нет userId - возвращаем 0
    if (!userId) {
      return NextResponse.json({ spinsLeft: 0, maxSpins: 3, isAdmin: false });
    }

    // Если админ - возвращаем бесконечные попытки
    if (userRole === 'ADMIN') {
      return NextResponse.json({ spinsLeft: 999999, maxSpins: 999999, isAdmin: true });
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

    // Проверяем существует ли пользователь в БД
    let userExists = false;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      userExists = !!user;
    } catch (err) {
      console.log('User lookup failed:', err);
    }

    // Если пользователь не найден в БД - даём maxSpins
    if (!userExists) {
      console.log('User not in DB - returning maxSpins');
      return NextResponse.json({ spinsLeft: maxSpins, maxSpins, isAdmin: false });
    }

    // Получаем или создаем запись о попытках
    let userSpin = null;
    try {
      userSpin = await prisma.userSpin.findFirst({
        where: { userId: userId },
      });
    } catch (err) {
      console.log('userSpin lookup failed:', err);
    }

    if (!userSpin) {
      try {
        userSpin = await prisma.userSpin.create({
          data: { userId: userId, spinsLeft: maxSpins },
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
    // Получаем userId из заголовка (отправляем с клиента)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    console.log('POST /api/spins - userId:', userId, 'role:', userRole);
    
    // Проверяем авторизацию
    if (!userId) {
      return NextResponse.json(
        { error: 'Необходимо авторизоваться' },
        { status: 401 }
      );
    }

    const session = { id: userId, role: userRole };

    // Получаем данные из тела запроса (выпавший сегмент)
    const body = await request.json();
    const { segmentId } = body;

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

    // Проверяем роль пользователя
    let isAdmin = false;
    let userExists = false;
    
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { role: true },
      });
      if (currentUser) {
        userExists = true;
        isAdmin = currentUser.role === 'ADMIN';
      }
    } catch (err) {
      console.log('User lookup failed:', err);
    }

    console.log('Session:', session.id, 'exists:', userExists, 'isAdmin:', isAdmin);

    // Если админ - всегда разрешаем
    if (isAdmin) {
      return NextResponse.json({ spinsLeft: 999999, maxSpins: 999999 });
    }

    // Для обычных пользователей - работаем с попытками
    let spinsLeft = maxSpins;
    
    if (userExists) {
      try {
        let userSpin = await prisma.userSpin.findFirst({
          where: { userId: session.id },
        });

        if (!userSpin) {
          userSpin = await prisma.userSpin.create({
            data: { userId: session.id, spinsLeft: maxSpins },
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
    }

    // Записываем в историю (только если пользователь найден)
    if (segmentId && userExists) {
      try {
        await prisma.spinHistory.create({
          data: { segmentId: segmentId, userId: session.id },
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
