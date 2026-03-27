// API Spins Route - Updated
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить оставшиеся попытки пользователя
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({ spinsLeft: 0, maxSpins: 3 });
    }

    const session = JSON.parse(sessionCookie.value);

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
    });
  } catch (error) {
    console.error('Get spins error:', error);
    return NextResponse.json({ spinsLeft: 3, maxSpins: 3 });
  }
}

// POST - использовать одну попытку и записать результат
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Необходимо авторизоваться' },
        { status: 401 }
      );
    }

    const session = JSON.parse(sessionCookie.value);

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

    // Получаем запись о попытках
    let userSpin = await prisma.userSpin.findFirst({
      where: { userId: session.id },
    });

    // Если записи нет, создаем с максимальными попытками
    if (!userSpin) {
      userSpin = await prisma.userSpin.create({
        data: {
          userId: session.id,
          spinsLeft: maxSpins,
        },
      });
    }

    if (userSpin.spinsLeft <= 0) {
      return NextResponse.json(
        { error: 'Попытки закончились' },
        { status: 400 }
      );
    }

    // Уменьшаем количество попыток только для обычных пользователей
    let updated = userSpin;
    try {
      // Проверяем роль пользователя
      const currentUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { role: true },
      });
      
      // Если не админ - уменьшаем попытки
      if (currentUser?.role !== 'ADMIN') {
        updated = await prisma.userSpin.update({
          where: { id: userSpin.id },
          data: { spinsLeft: userSpin.spinsLeft - 1 },
        });
      }
    } catch (err) {
      console.error('Error updating spins:', err);
    }

    // Записываем в историю выигрышей для всех пользователей
    if (segmentId) {
      try {
        await prisma.spinHistory.create({
          data: {
            segmentId: segmentId,
            userId: session.id,
          },
        });
      } catch (err) {
        console.error('Error saving spin history:', err);
      }
    } else {
      // Если segmentId не передан (для админа без ограничений), получаем случайный сегмент
      try {
        const segments = await prisma.segment.findMany({
          where: { active: true },
        });
        if (segments.length > 0) {
          const randomSegment = segments[Math.floor(Math.random() * segments.length)];
          await prisma.spinHistory.create({
            data: {
              segmentId: randomSegment.id,
              userId: session.id,
            },
          });
        }
      } catch (err) {
        console.error('Error saving spin history for admin:', err);
      }
    }

    return NextResponse.json({ 
      spinsLeft: updated.spinsLeft, 
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
