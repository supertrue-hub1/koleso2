'use client';

import { useRef, useEffect, useCallback } from 'react';
import { WheelSegment, calculateSegmentAngles } from '@/utils/weightedRandom';

interface WheelProps {
  segments: WheelSegment[];
  rotation: number;
  isSpinning: boolean;
  size?: number;
}

// Цвета сегментов в стиле оранжево-чёрной темы
const SEGMENT_COLORS = [
  '#FF6B00', // Основной оранжевый
  '#FF8533', // Светлый оранжевый
  '#E65C00', // Тёмный оранжевый
  '#FFB347', // Золотистый
  '#CC5500', // Коричневато-оранжевый
  '#FF7722', // Яркий оранжевый
  '#FF9944', // Персиковый оранжевый
  '#DD6611', // Глубокий оранжевый
  '#FFAA33', // Светло-оранжевый
  '#BB5500', // Тёмно-оранжевый
];

export default function Wheel({ segments, rotation, isSpinning, size = 400 }: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const currentRotationRef = useRef(0);

  // Получаем цвет сегмента по индексу
  const getSegmentColor = (index: number): string => {
    return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
  };

  // Рисуем колесо
  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, currentRotation: number) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 15;

    // Очищаем канвас
    ctx.clearRect(0, 0, size, size);

    // Внешний круг (рамка)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#1A1A1A';
    ctx.fill();
    
    // Оранжевая обводка
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Сохраняем состояние и применяем вращение
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotation);
    ctx.translate(-centerX, -centerY);

    // Вычисляем углы сегментов
    const segmentAngles = calculateSegmentAngles(segments);
    const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);

    if (totalWeight === 0 || segments.length === 0) {
      // Рисуем пустое колесо
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#2A2A2A';
      ctx.fill();
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Рисуем сегменты
      segments.forEach((segment, index) => {
        const angles = segmentAngles.get(segment.id);
        if (!angles) return;

        // Рисуем сегмент
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angles.start, angles.end);
        ctx.closePath();

        // Градиент для сегмента (от центра к краю)
        const midAngle = (angles.start + angles.end) / 2;
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius
        );
        
        const baseColor = getSegmentColor(index);
        gradient.addColorStop(0, lightenColor(baseColor, 30));
        gradient.addColorStop(0.7, baseColor);
        gradient.addColorStop(1, darkenColor(baseColor, 20));

        ctx.fillStyle = gradient;
        ctx.fill();

        // Границы сегментов (белые линии)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Текст
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(midAngle);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(11, Math.min(16, radius * 0.07))}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        const textRadius = radius * 0.72;
        const text = segment.label.length > 10 ? segment.label.substring(0, 8) + '...' : segment.label;
        ctx.fillText(text.toUpperCase(), textRadius, 5);
        ctx.restore();
      });
    }

    // Восстанавливаем состояние
    ctx.restore();

    // Центральный круг
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI);
    const centerGradient = ctx.createRadialGradient(
      centerX - radius * 0.03,
      centerY - radius * 0.03,
      0,
      centerX,
      centerY,
      radius * 0.15
    );
    centerGradient.addColorStop(0, '#3A3A3A');
    centerGradient.addColorStop(1, '#1A1A1A');
    ctx.fillStyle = centerGradient;
    ctx.fill();
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Декоративные точки по краю (оранжевые)
    const numDots = 24;
    for (let i = 0; i < numDots; i++) {
      const angle = (i / numDots) * 2 * Math.PI;
      const dotX = centerX + Math.cos(angle) * (radius + 5);
      const dotY = centerY + Math.sin(angle) * (radius + 5);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#FF6B00' : '#FF8533';
      ctx.fill();
    }
  }, [segments, size]);

  // Анимация вращения с easing
  const animateSpin = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startRotation = currentRotationRef.current;
    const targetRotation = rotation;
    const duration = 5000; // 5 секунд
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing функция (easeOutQuart)
      const eased = 1 - Math.pow(1 - progress, 4);

      currentRotationRef.current = startRotation + (targetRotation - startRotation) * eased;

      drawWheel(ctx, currentRotationRef.current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [rotation, drawWheel]);

  // Эффект для анимации
  useEffect(() => {
    if (isSpinning && rotation !== 0) {
      animateSpin();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, rotation, animateSpin]);

  // Начальная отрисовка
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размер канваса
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    drawWheel(ctx, currentRotationRef.current);
  }, [segments, size, drawWheel]);

  return (
    <div className="relative inline-block">
      {/* Указатель сверху */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
        <svg width="36" height="45" viewBox="0 0 36 45" fill="none">
          <path
            d="M18 45L3 12L18 0L33 12L18 45Z"
            fill="#FF6B00"
          />
          <path
            d="M18 40L6 12L18 3L30 12L18 40Z"
            fill="#FF8533"
          />
          <path
            d="M18 35L9 12L18 5L27 12L18 35Z"
            fill="#FFB347"
          />
        </svg>
      </div>

      {/* Канвас с колесом */}
      <canvas
        ref={canvasRef}
        className={`rounded-full ${isSpinning ? 'spin-active' : ''}`}
      />
    </div>
  );
}

// Вспомогательные функции для цвета
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}
