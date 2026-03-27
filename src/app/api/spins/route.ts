// API Spins Route - Updated
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить оставшиеся попытки пользователя
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({ spinsLeft: 0, maxSpins: 3, isAdmin: false });
    }

    const session = JSON.parse(sessionCookie.value);

    // Проверяем роль пользователя
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true },
    });

    // Если админ - возвращаем бесконечные попытки
    if (currentUser?.role === 'ADMIN') {
      return NextResponse.json({ 
        spinsLeft: 999999, 
        maxSpins: 999999,
        isAdmin: true,
      });
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
      // Игнорируем ошибку
    }

    // Получаем или создаем запись о попытках пользователя
    let userSpin = await prisma.userSpin.findFirst({
      where: { userId: session.id },
    });

    if (!userSpin) {
      userSpin = await prisma.userSpin.create({
        data: {
          userId: session.id,
          spinsLeft: maxSpins,
        },
      });
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

    // Проверяем существование пользователя
    let currentUser = null;
    try {
      currentUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { role: true },
      });
    } catch (err) {
      console.log('User not found in DB');
    }

    // Если пользователь не найден в БД - просто разрешаем спин без записи в БД
    if (!currentUser) {
      console.log('User not in DB - allowing spin without tracking');
      return NextResponse.json({ 
        spinsLeft: maxSpins, 
        maxSpins,
      });
    }

    // Если админ - пропускаем проверку попыток
    if (currentUser.role === 'ADMIN') {
      return NextResponse.json({ spinsLeft: 999999, maxSpins: 999999 });
    }

    // Для обычных пользователей - работаем с попытками
    let userSpin = null;
    try {
      userSpin = await prisma.userSpin.findFirst({
        where: { userId: session.id },
      });
    } catch (err) {
      console.log('userSpin not found');
    }

    // Если записи нет, создаем с максимальными попытками
    if (!userSpin) {
      try {
        userSpin = await prisma.userSpin.create({
          data: {
            userId: session.id,
            spinsLeft: maxSpins,
          },
        });
      } catch (err) {
        console.log('Could not create userSpin');
        // Разрешаем спин без трекинга
        return NextResponse.json({ spinsLeft: maxSpins, maxSpins });
      }
    }

    if (!userSpin || userSpin.spinsLeft <= 0) {
      return NextResponse.json(
        { error: 'Попытки закончились' },
        { status: 400 }
      );
    }

    // Уменьшаем количество попыток
    let updatedSpinsLeft = userSpin.spinsLeft - 1;
    if (userSpin.id) {
      try {
        await prisma.userSpin.update({
          where: { id: userSpin.id },
          data: { spinsLeft: updatedSpinsLeft },
        });
      } catch (err) {
        console.log('Could not update spins');
      }
    }

    // Записываем в историю выигрышей
    if (segmentId) {
      try {
        await prisma.spinHistory.create({
          data: {
            segmentId: segmentId,
            userId: session.id,
          },
        });
      } catch (err) {
        console.log('Could not save spin history');
      }
    }

    return NextResponse.json({ 
      spinsLeft: updatedSpinsLeft, 
      maxSpins,
    });
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
