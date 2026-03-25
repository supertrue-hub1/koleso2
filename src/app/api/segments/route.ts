import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - получить все активные сегменты
export async function GET() {
  try {
    const segments = await db.segment.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });

    // Если сегментов нет, создаем дефолтные
    if (segments.length === 0) {
      const defaultSegments = [
        { label: 'Приз 1', color: '#FF6B00', weight: 25, order: 1 },
        { label: 'Приз 2', color: '#FF8533', weight: 25, order: 2 },
        { label: 'Приз 3', color: '#E65C00', weight: 20, order: 3 },
        { label: 'Приз 4', color: '#FFB347', weight: 15, order: 4 },
        { label: 'Приз 5', color: '#CC5500', weight: 15, order: 5 },
      ];

      const created = await db.segment.createMany({
        data: defaultSegments,
      });

      const newSegments = await db.segment.findMany({
        where: { active: true },
        orderBy: { order: 'asc' },
      });

      return NextResponse.json({ segments: newSegments });
    }

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('Get segments error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении сегментов' },
      { status: 500 }
    );
  }
}
