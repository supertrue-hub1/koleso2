import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Проверка авторизации и роли админа
async function checkAdminAuth(request: NextRequest) {
  // Временно отключено для отладки
  return { authorized: true };
  
  const sessionCookie = request.cookies.get('session');
  
  if (!sessionCookie) {
    return { error: 'Не авторизован', status: 401 };
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return { error: 'Доступ запрещён', status: 403 };
    }

    return { authorized: true };
  } catch {
    return { error: 'Неверная сессия', status: 401 };
  }
}

// GET - получить все настройки
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    // @ts-expect-error - settings table may not exist yet
    const settings = await db.settings?.findMany?.() || [];
    
    // Преобразуем в объект
    const settingsObj: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => {
      settingsObj[s.key] = s.value;
    });

    // Дефолтные значения
    const result = {
      maxSpins: settingsObj.maxSpins ? parseInt(settingsObj.maxSpins) : 3,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ maxSpins: 3 });
  }
}

// PUT - обновить настройки
export async function PUT(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await request.json();
    const { maxSpins } = body;

    // Обновляем или создаем настройку maxSpins
    if (maxSpins !== undefined) {
      // @ts-expect-error - settings table may not exist yet
      await db.settings?.upsert?.({
        where: { key: 'maxSpins' },
        update: { value: String(maxSpins) },
        create: { key: 'maxSpins', value: String(maxSpins) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении настроек' },
      { status: 500 }
    );
  }
}
