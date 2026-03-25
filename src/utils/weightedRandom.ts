// Типы для сегмента колеса
export interface WheelSegment {
  id: string;
  label: string;
  color: string;
  weight: number;
}

/**
 * Вычисляет вероятность для каждого сегмента на основе весов
 * вероятность = вес сегмента / сумма всех весов
 */
export function calculateProbabilities(segments: WheelSegment[]): Map<string, number> {
  const probabilities = new Map<string, number>();
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  
  if (totalWeight === 0) {
    segments.forEach(segment => probabilities.set(segment.id, 0));
    return probabilities;
  }
  
  segments.forEach(segment => {
    probabilities.set(segment.id, segment.weight / totalWeight);
  });
  
  return probabilities;
}

/**
 * Выбирает победителя на основе взвешенной случайности
 * Использует метод "roulette wheel selection"
 */
export function getWeightedRandomWinner(segments: WheelSegment[]): WheelSegment | null {
  if (segments.length === 0) return null;
  
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  
  if (totalWeight === 0) return null;
  
  // Генерируем случайное число от 0 до totalWeight
  let random = Math.random() * totalWeight;
  
  // Проходим по сегментам и находим победителя
  for (const segment of segments) {
    random -= segment.weight;
    if (random <= 0) {
      return segment;
    }
  }
  
  // Возвращаем последний сегмент (на случай погрешности float)
  return segments[segments.length - 1];
}

/**
 * Вычисляет угол начала для каждого сегмента на колесе
 * Возвращает Map<id сегмента, начальный угол в радианах>
 */
export function calculateSegmentAngles(segments: WheelSegment[]): Map<string, { start: number; end: number }> {
  const angles = new Map<string, { start: number; end: number }>();
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  
  if (totalWeight === 0) return angles;
  
  let currentAngle = -Math.PI / 2; // Начинаем сверху (12 часов)
  
  segments.forEach(segment => {
    const segmentAngle = (segment.weight / totalWeight) * 2 * Math.PI;
    angles.set(segment.id, {
      start: currentAngle,
      end: currentAngle + segmentAngle
    });
    currentAngle += segmentAngle;
  });
  
  return angles;
}

/**
 * Вычисляет целевой угол вращения для попадания в выбранный сегмент
 * @param segmentAngles - углы сегментов
 * @param winnerId - id победившего сегмента
 * @param fullRotations - количество полных оборотов для визуального эффекта
 * @returns угол в радианах, на который нужно повернуть колесо
 */
export function calculateTargetRotation(
  segmentAngles: Map<string, { start: number; end: number }>,
  winnerId: string,
  fullRotations: number = 5
): number {
  const segment = segmentAngles.get(winnerId);
  if (!segment) return 0;
  
  // Средний угол сегмента
  const segmentMiddle = (segment.start + segment.end) / 2;
  
  // Нам нужно, чтобы указатель (вверху, угол -PI/2) указывал на середину сегмента
  // Колесо вращается по часовой стрелке, поэтому вычитаем
  const targetAngle = -segmentMiddle - Math.PI / 2;
  
  // Добавляем полные обороты для визуального эффекта
  const fullRotationAngle = fullRotations * 2 * Math.PI;
  
  return fullRotationAngle + targetAngle;
}

/**
 * Генерирует уникальный ID для сегмента
 */
export function generateSegmentId(): string {
  return `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Предустановленные цвета для новых сегментов
 */
export const PRESET_COLORS = [
  '#FF6B6B', // Красный
  '#4ECDC4', // Бирюзовый
  '#45B7D1', // Голубой
  '#96CEB4', // Мятный
  '#FFEAA7', // Жёлтый
  '#DDA0DD', // Сливовый
  '#98D8C8', // Светло-бирюзовый
  '#F7DC6F', // Золотой
  '#BB8FCE', // Фиолетовый
  '#85C1E9', // Небесно-голубой
  '#F8B500', // Оранжевый
  '#58D68D', // Зелёный
];

/**
 * Дефолтные сегменты для инициализации
 */
export const DEFAULT_SEGMENTS: WheelSegment[] = [
  { id: 'seg_1', label: 'Приз 1', color: '#FF6B6B', weight: 25 },
  { id: 'seg_2', label: 'Приз 2', color: '#4ECDC4', weight: 25 },
  { id: 'seg_3', label: 'Приз 3', color: '#45B7D1', weight: 20 },
  { id: 'seg_4', label: 'Приз 4', color: '#96CEB4', weight: 15 },
  { id: 'seg_5', label: 'Приз 5', color: '#FFEAA7', weight: 15 },
];
