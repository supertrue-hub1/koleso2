import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Проверка авторизации (временно отключено)
async function checkAdminAuth(request: NextRequest) {
  return { authorized: true };
}

// GET - получить топ 10 выигрышей
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    let winners = [];
    
    // Пробуем получить данные
    try {
      winners = await db.spinHistory.findMany({
        where: {
          userId: {
            not: null,
          },
        },
        include: {
          segment: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });
    } catch (err) {
      console.log('SpinHistory table does not exist or has no data');
      return NextResponse.json({ winners: [], message: 'Таблица пуста или не создана' });
    }

    // Группируем по пользователю - последний выигрыш
    const userWinners: Record<string, {
      userId: string;
      name: string | null;
      email: string;
      phone: string | null;
      won: string;
      wonAt: Date;
    }> = {};

    for (const w of winners) {
      if (!w.userId || !w.user) continue;
      
      if (!userWinners[w.userId]) {
        userWinners[w.userId] = {
          userId: w.userId,
          name: w.user.name,
          email: w.user.email,
          phone: w.user.phone,
          won: w.segment.label,
          wonAt: w.createdAt,
        };
      }
    }

    // Берем топ 10
    const top10 = Object.values(userWinners)
      .sort((a, b) => new Date(b.wonAt).getTime() - new Date(a.wonAt).getTime())
      .slice(0, 10);

    return NextResponse.json({ winners: top10 });
  } catch (error) {
    console.error('Get winners error:', error);
    return NextResponse.json({ winners: [] });
  }
}

// DELETE - сбросить историю победителей
export async function DELETE(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  
  try {
    await db.spinHistory.deleteMany({});
    return NextResponse.json({ success: true, message: 'История победителей очищена' });
  } catch (error) {
    console.error('Reset winners error:', error);
    return NextResponse.json({ error: 'Ошибка при очистке истории' }, { status: 500 });
  }
}
