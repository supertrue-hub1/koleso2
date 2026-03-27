import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - получить все настройки
export async function GET(request: NextRequest) {
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
