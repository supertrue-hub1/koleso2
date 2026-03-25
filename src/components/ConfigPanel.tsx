'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WheelSegment, PRESET_COLORS, generateSegmentId, calculateProbabilities } from '@/utils/weightedRandom';

interface ConfigPanelProps {
  segments: WheelSegment[];
  onSegmentsChange: (segments: WheelSegment[]) => void;
}

export default function ConfigPanel({ segments, onSegmentsChange }: ConfigPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WheelSegment>>({});

  const probabilities = calculateProbabilities(segments);
  const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);

  const handleAddSegment = () => {
    const newSegment: WheelSegment = {
      id: generateSegmentId(),
      label: `Приз ${segments.length + 1}`,
      color: PRESET_COLORS[segments.length % PRESET_COLORS.length],
      weight: 10,
    };
    onSegmentsChange([...segments, newSegment]);
    setEditingId(newSegment.id);
    setEditForm(newSegment);
  };

  const handleRemoveSegment = (id: string) => {
    if (segments.length <= 2) {
      alert('Минимум 2 сегмента должно быть на колесе!');
      return;
    }
    onSegmentsChange(segments.filter((s) => s.id !== id));
  };

  const handleStartEdit = (segment: WheelSegment) => {
    setEditingId(segment.id);
    setEditForm({ ...segment });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editForm.label || !editForm.weight) return;

    const updatedSegments = segments.map((s) =>
      s.id === editingId
        ? {
            ...s,
            label: editForm.label || s.label,
            color: editForm.color || s.color,
            weight: Math.max(1, Math.min(100, editForm.weight || s.weight)),
          }
        : s
    );
    onSegmentsChange(updatedSegments);
    setEditingId(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <Card className="w-full max-w-md bg-[#2A2A2A] border border-[#444444] rounded-[10px]">
      <CardHeader className="pb-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-b from-[#FFA500] to-[#FF8C00] flex items-center justify-center rounded-[6px]">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-lg text-white font-bold tracking-wide">
              НАСТРОЙКА СЕКТОРОВ
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#999999] hover:text-white hover:bg-transparent rounded-full"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-4">
              {/* Список сегментов */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {segments.map((segment, index) => (
                    <motion.div
                      key={segment.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.2 }}
                      className={`group relative p-3 bg-[#333333] border border-[#444444] hover:border-[#FF8C00] transition-all rounded-[8px] ${
                        editingId === segment.id ? 'border-[#FF8C00] ring-1 ring-[#FF8C00]/30' : ''
                      }`}
                    >
                      {editingId === segment.id ? (
                        // Режим редактирования
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={editForm.label || ''}
                              onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                              placeholder="Название"
                              className="bg-[#1A1A1A] border-[#444444] text-white focus:border-[#FF8C00] rounded-[8px]"
                            />
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={editForm.weight || ''}
                              onChange={(e) => setEditForm({ ...editForm, weight: Number(e.target.value) })}
                              className="w-20 bg-[#1A1A1A] border-[#444444] text-white text-center rounded-[8px]"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#999999] text-xs">Цвет:</span>
                            <div className="flex gap-1 flex-wrap">
                              {PRESET_COLORS.slice(0, 8).map((color) => (
                                <button
                                  key={color}
                                  onClick={() => setEditForm({ ...editForm, color })}
                                  className={`w-6 h-6 border-2 transition-all rounded-[4px] ${
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
                              onClick={handleSaveEdit}
                              className="flex-1 btn-primary text-white font-medium"
                            >
                              <Check className="w-4 h-4 mr-1" /> Сохранить
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleCancelEdit}
                              className="flex-1 btn-secondary text-[#999999] hover:text-white"
                            >
                              <X className="w-4 h-4 mr-1" /> Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Режим просмотра
                        <div className="flex items-center gap-3">
                          {/* Номер */}
                          <div className="number-badge rounded-[4px]">
                            {index + 1}
                          </div>
                          
                          {/* Цвет */}
                          <div
                            className="w-3 h-3 rounded-[2px]"
                            style={{ backgroundColor: segment.color }}
                          />
                          
                          {/* Название и вес */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium uppercase text-sm tracking-wide truncate">
                                {segment.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[#999999] text-xs">
                                Вес: {segment.weight}
                              </span>
                              {totalWeight > 0 && (
                                <span className="text-[#FF8C00] text-xs font-medium">
                                  {((probabilities.get(segment.id) || 0) * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Кнопки действий */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStartEdit(segment)}
                              className="h-8 w-8 text-[#999999] hover:text-[#FF8C00] hover:bg-[#FF8C00]/10 rounded-[6px]"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveSegment(segment.id)}
                              className="h-8 w-8 text-[#999999] hover:text-red-500 hover:bg-red-500/10 rounded-[6px]"
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

              {/* Кнопка добавления */}
              <Button
                onClick={handleAddSegment}
                className="w-full btn-primary text-white font-semibold py-5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить сектор
              </Button>

              {/* Статистика */}
              <div className="pt-3 border-t border-[#444444]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#999999]">Всего секторов:</span>
                  <span className="text-white font-bold">{segments.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-[#999999]">Общий вес:</span>
                  <span className="text-white font-bold">{totalWeight}</span>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
