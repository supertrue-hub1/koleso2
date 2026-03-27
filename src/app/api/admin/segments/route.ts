import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Проверка авторизации и роли админа
async function checkAdminAuth(request: NextRequest) {
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

// GET - получить все сегменты (включая неактивные)
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const segments = await db.segment.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('Get segments error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении сегментов' },
      { status: 500 }
    );
  }
}

// POST - создать новый сегмент
export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { label, color, weight } = body;

    if (!label || !color || !weight) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    const maxOrder = await db.segment.aggregate({
      _max: { order: true },
    });

    const segment = await db.segment.create({
      data: {
        label,
        color,
        weight: Number(weight),
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    return NextResponse.json({ segment });
  } catch (error) {
    console.error('Create segment error:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании сегмента' },
      { status: 500 }
    );
  }
}

// PUT - обновить все сегменты
export async function PUT(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { segments } = body;

    if (!Array.isArray(segments)) {
      return NextResponse.json(
        { error: 'Неверный формат данных' },
        { status: 400 }
      );
    }

    for (const seg of segments) {
      await db.segment.update({
        where: { id: seg.id },
        data: {
          label: seg.label,
          color: seg.color,
          weight: seg.weight,
          order: seg.order,
          active: seg.active,
        },
      });
    }

    const updatedSegments = await db.segment.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ segments: updatedSegments });
  } catch (error) {
    console.error('Update segments error:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении сегментов' },
      { status: 500 }
    );
  }
}

// DELETE - удалить сегмент
export async function DELETE(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID сегмента обязателен' },
        { status: 400 }
      );
    }

    await db.segment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete segment error:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении сегмента' },
      { status: 500 }
    );
  }
}
