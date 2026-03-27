'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, Save, RefreshCw, ChevronLeft, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Segment {
  id: string;
  label: string;
  color: string;
  weight: number;
  order: number;
  active: boolean;
}

interface AdminPanelProps {
  onClose: () => void;
  onSegmentsUpdate?: () => void;
}

const PRESET_COLORS = [
  '#FF6B00', '#FF8533', '#E65C00', '#FFB347',
  '#CC5500', '#FF7722', '#FF9944', '#DD6611',
  '#FFAA33', '#BB5500', '#FF5500', '#FFCC00',
];

export default function AdminPanel({ onClose, onSegmentsUpdate }: AdminPanelProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Segment>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Настройки
  const [maxSpins, setMaxSpins] = useState(3);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Загрузка сегментов
  const loadSegments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/segments', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSegments(data.segments);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка настроек
  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMaxSpins(data.maxSpins || 3);
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadSegments();
    loadSettings();
  }, []);

  // Сохранение настроек
  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ maxSpins }),
      });

      if (response.ok) {
        alert('Настройки сохранены!');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      alert('Ошибка при сохранении настроек');
    }
  };

  // Сброс попыток всех пользователей
  const handleResetSpins = async () => {
    if (!confirm('Сбросить попытки всем пользователям?')) return;

    try {
      const response = await fetch('/api/spins', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        alert('Попытки сброшены!');
      } else {
        alert('Ошибка при сбросе');
      }
    } catch (error) {
      console.error('Reset spins error:', error);
      alert('Ошибка при сбросе');
    }
  };

  // Добавление сегмента
  const handleAdd = async () => {
    const newSegment = {
      label: `Новый приз ${segments.length + 1}`,
      color: PRESET_COLORS[segments.length % PRESET_COLORS.length],
      weight: 10,
    };

    try {
      const response = await fetch('/api/admin/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newSegment),
      });

      if (response.ok) {
        const data = await response.json();
        setSegments([...segments, data.segment]);
      }
    } catch (error) {
      console.error('Add error:', error);
    }
  };

  // Удаление сегмента
  const handleDelete = async (id: string) => {
    if (segments.length <= 2) {
      alert('Минимум 2 сегмента должно быть!');
      return;
    }

    if (!confirm('Удалить этот сегмент?')) return;

    try {
      const response = await fetch(`/api/admin/segments?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setSegments(segments.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Начать редактирование
  const startEdit = (segment: Segment) => {
    setEditingId(segment.id);
    setEditForm({ ...segment });
  };

  // Отменить редактирование
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Сохранить изменения одного сегмента
  const saveEdit = () => {
    if (!editingId) return;

    const updated = segments.map(s => 
      s.id === editingId 
        ? { ...s, ...editForm, weight: Number(editForm.weight) || s.weight }
        : s
    );
    
    setSegments(updated);
    setEditingId(null);
    setEditForm({});
  };

  // Сохранить все изменения
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Сохраняем сегменты
      const segmentsResponse = await fetch('/api/admin/segments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ segments }),
      });

      // Сохраняем настройки
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ maxSpins }),
      });

      if (segmentsResponse.ok) {
        onSegmentsUpdate();
        alert('Все изменения сохранены!');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  // Переключение активности
  const toggleActive = (id: string) => {
    setSegments(segments.map(s => 
      s.id === id ? { ...s, active: !s.active } : s
    ));
  };

  const totalWeight = segments.filter(s => s.active).reduce((sum, s) => sum + s.weight, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#1A1A1A] overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Шапка */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={onClose}
              className="btn-secondary text-[#999999] hover:text-white"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Назад
            </Button>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              АДМИН-ПАНЕЛЬ
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => { loadSegments(); loadSettings(); }}
              disabled={loading}
              className="btn-secondary text-[#999999] hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="btn-primary text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ ВСЁ'}
            </Button>
          </div>
        </div>

        {/* Настройки */}
        <Card className="bg-[#2A2A2A] border border-[#444444] rounded-[10px] mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-b from-[#FFA500] to-[#FF8C00] flex items-center justify-center rounded-[6px]">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg text-white font-bold tracking-wide">
                НАСТРОЙКИ
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-[#999999] text-sm whitespace-nowrap">
                  Попыток на пользователя:
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={maxSpins}
                  onChange={(e) => setMaxSpins(Math.max(1, Number(e.target.value)))}
                  className="w-20 bg-[#1A1A1A] border-[#444444] text-white text-center rounded-[8px]"
                />
              </div>
              <Button
                onClick={handleResetSpins}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-[8px]"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Сбросить попытки всем
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Статистика сегментов */}
        <Card className="bg-[#2A2A2A] border border-[#444444] rounded-[10px] mb-6">
          <CardContent className="py-4">
            <div className="flex gap-8">
              <div>
                <span className="text-[#999999] text-sm">Всего сегментов:</span>
                <span className="text-white font-bold ml-2">{segments.length}</span>
              </div>
              <div>
                <span className="text-[#999999] text-sm">Активных:</span>
                <span className="text-[#FF8C00] font-bold ml-2">
                  {segments.filter(s => s.active).length}
                </span>
              </div>
              <div>
                <span className="text-[#999999] text-sm">Общий вес:</span>
                <span className="text-white font-bold ml-2">{totalWeight}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Заголовок секции сегментов */}
        <h2 className="text-lg font-bold text-white tracking-wide mb-4">СЕГМЕНТЫ КОЛЕСА</h2>

        {/* Список сегментов */}
        {loading ? (
          <div className="text-center text-[#666666] py-12">Загрузка...</div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {segments.map((segment, index) => (
                <motion.div
                  key={segment.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`p-4 rounded-[10px] border transition-all ${
                    !segment.active 
                      ? 'bg-[#1A1A1A] border-[#333333] opacity-60' 
                      : 'bg-[#2A2A2A] border-[#444444] hover:border-[#FF8C00]'
                  } ${editingId === segment.id ? 'border-[#FF8C00] ring-1 ring-[#FF8C00]/30' : ''}`}
                >
                  {editingId === segment.id ? (
                    // Режим редактирования
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <Input
                          value={editForm.label || ''}
                          onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                          placeholder="Название"
                          className="bg-[#1A1A1A] border-[#444444] text-white rounded-[8px]"
                        />
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={editForm.weight || ''}
                          onChange={(e) => setEditForm({ ...editForm, weight: Number(e.target.value) })}
                          className="w-24 bg-[#1A1A1A] border-[#444444] text-white text-center rounded-[8px]"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#999999] text-xs">Цвет:</span>
                        <div className="flex gap-1 flex-wrap">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditForm({ ...editForm, color })}
                              className={`w-7 h-7 border-2 transition-all rounded-[4px] ${
                                editForm.color === color
                                  ? 'border-white scale-110'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          className="btn-primary text-white"
                        >
                          <Check className="w-4 h-4 mr-1" /> Готово
                        </Button>
                        <Button
                          size="sm"
                          onClick={cancelEdit}
                          className="btn-secondary text-[#999999] hover:text-white"
                        >
                          <X className="w-4 h-4 mr-1" /> Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Режим просмотра
                    <div className="flex items-center gap-4">
                      {/* Номер */}
                      <div className="number-badge rounded-[4px] text-sm">
                        {index + 1}
                      </div>
                      
                      {/* Цвет */}
                      <div
                        className={`w-4 h-4 rounded-[2px] ${!segment.active ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: segment.color }}
                      />
                      
                      {/* Название и вес */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium uppercase text-sm tracking-wide truncate ${
                            !segment.active ? 'text-[#666666]' : 'text-white'
                          }`}>
                            {segment.label}
                          </span>
                          {!segment.active && (
                            <span className="text-xs text-[#666666] bg-[#333333] px-2 py-0.5 rounded-[4px]">
                              НЕАКТИВЕН
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-[#999999] text-xs">
                            Вес: {segment.weight}
                          </span>
                          {segment.active && totalWeight > 0 && (
                            <span className="text-[#FF8C00] text-xs font-medium">
                              {((segment.weight / totalWeight) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Кнопки действий */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => toggleActive(segment.id)}
                          className={`${
                            segment.active 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-[#444444] hover:bg-[#555555]'
                          } text-white rounded-[8px]`}
                        >
                          {segment.active ? 'Вкл' : 'Выкл'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => startEdit(segment)}
                          className="btn-secondary text-[#999999] hover:text-white rounded-[8px]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDelete(segment.id)}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-[8px]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Кнопка добавления */}
        <Button
          onClick={handleAdd}
          className="w-full btn-primary text-white font-semibold py-6 mt-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          ДОБАВИТЬ СЕКТОР
        </Button>
      </div>
    </motion.div>
  );
}
