import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - получить публичные настройки
export async function GET() {
  try {
    // @ts-expect-error - settings table may not exist yet
    const maxSpinsSetting = await db.settings?.findUnique?.({
      where: { key: 'maxSpins' },
    });

    const maxSpins = maxSpinsSetting ? parseInt(maxSpinsSetting.value) : 3;

    return NextResponse.json({ 
      maxSpins,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ maxSpins: 3 });
  }
}
