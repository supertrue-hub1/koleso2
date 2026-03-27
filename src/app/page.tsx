'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, Trophy, X, LogOut, Settings, Gift } from 'lucide-react';
import { useUser, UserButton, SignInButton } from '@clerk/nextjs';
import Wheel from '@/components/Wheel';
import AdminPanel from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  WheelSegment,
  getWeightedRandomWinner,
  calculateSegmentAngles,
  calculateTargetRotation,
} from '@/utils/weightedRandom';

export default function Home() {
  const { user: clerkUser, isSignedIn } = useUser();
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelSegment | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  
  // Состояния авторизации
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Попытки
  const [spinsLeft, setSpinsLeft] = useState(0);
  const [maxSpins, setMaxSpins] = useState(3);
  
  // Модальное окно призов
  const [showPrizes, setShowPrizes] = useState(false);

  // Загрузка сегментов
  useEffect(() => {
    loadSegments();
  }, []);

  // Загрузка попыток при авторизации
  useEffect(() => {
    if (isSignedIn) {
      loadSpins();
    }
  }, [isSignedIn]);

  const loadSegments = async () => {
    try {
      const response = await fetch('/api/segments');
      const data = await response.json();
      if (data.segments) {
        setSegments(data.segments.map((s: { id: string; label: string; color: string; weight: number }) => ({
          id: s.id,
          label: s.label,
          color: s.color,
          weight: s.weight,
        })));
      }
    } catch (error) {
      console.error('Load segments error:', error);
    }
  };

  const loadSpins = async () => {
    try {
      const response = await fetch('/api/spins');
      const data = await response.json();
      setSpinsLeft(data.spinsLeft);
      setMaxSpins(data.maxSpins);
    } catch (error) {
      console.error('Load spins error:', error);
    }
  };

  // Закрытие модального окна по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showResult) {
        setShowResult(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResult]);

  const handleSpin = useCallback(async () => {
    if (isSpinning || segments.length < 2) return;
    
    // Для обычных пользователей проверяем и уменьшаем попытки
    if (isSignedIn) {
      if (spinsLeft <= 0) {
        alert('У вас закончились попытки!');
        return;
      }
      
      // Уменьшаем попытки на сервере
      try {
        const response = await fetch('/api/spins', { method: 'POST' });
        if (!response.ok) {
          alert('Ошибка при использовании попытки');
          return;
        }
        const data = await response.json();
        setSpinsLeft(data.spinsLeft);
      } catch (error) {
        console.error('Spin error:', error);
        return;
      }
    }

    const winningSegment = getWeightedRandomWinner(segments);
    if (!winningSegment) return;

    const segmentAngles = calculateSegmentAngles(segments);
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const targetRotation = calculateTargetRotation(segmentAngles, winningSegment.id, fullRotations);

    setIsSpinning(true);
    setShowResult(false);
    setRotation((prev) => prev + targetRotation);
    setSpinCount((prev) => prev + 1);

    setTimeout(() => {
      setWinner(winningSegment);
      setShowResult(true);
      setIsSpinning(false);
    }, 5200);
  }, [isSpinning, segments, isSignedIn, spinsLeft]);

  const handleReset = useCallback(() => {
    setRotation(0);
    setWinner(null);
    setShowResult(false);
    setIsSpinning(false);
  }, []);

  const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
  
  // Проверяем можно ли крутить (пока не проверяем роль - позже добавим)
  const canSpin = isSignedIn || spinsLeft > 0;

  // Показываем админ-панель
  if (showAdmin && isSignedIn) {
    return (
      <AdminPanel 
        onClose={() => {
          setShowAdmin(false);
          loadSegments();
        }}
        onSegmentsUpdate={loadSegments}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1A1A1A] relative overflow-hidden">
      {/* Фоновое изображение */}
      <div 
        className="absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage: 'url(/background-scene.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Затемнение фона */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#1A1A1A]/50 via-transparent to-[#1A1A1A]/80" />
      
      {/* Шапка */}
      <header className="border-b border-[#444444] bg-[#2A2A2A]/95 backdrop-blur-sm relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Логотип */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Колесо Фортуны" 
                className="h-12 w-auto"
              />
            </div>
            
            {/* Правая часть */}
            <div className="flex items-center gap-3">
              {/* Кнопка Призы */}
              <Button
                onClick={() => setShowPrizes(true)}
                className="btn-secondary text-[#999999] hover:text-white"
              >
                <Gift className="w-4 h-4 mr-2" />
                Призы
              </Button>
              
              {/* Пользователь / Авторизация через Clerk */}
              {!isSignedIn ? (
                <SignInButton mode="modal">
                  <Button className="btn-primary text-white">
                    Войти
                  </Button>
                </SignInButton>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#999999]">
                    {clerkUser?.firstName || clerkUser?.emailAddresses[0]?.emailAddress}
                  </span>
                  <Button
                    onClick={() => setShowAdmin(true)}
                    className="btn-secondary text-[#999999] hover:text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Админ
                  </Button>
                  <UserButton />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="flex-1 relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Колесо и кнопка */}
            <div className="flex-1 flex flex-col items-center">
              {/* Заголовок секции */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-wider mb-2">
                  КРУТИ И ВЫИГРЫВАЙ
                </h2>
                <p className="text-[#999999]">
                  {isSignedIn 
                    ? `У вас ${spinsLeft} из ${maxSpins} попыток` 
                      : 'Войдите, чтобы крутить колесо'}
                </p>
              </motion.div>

              {/* Колесо */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="relative mb-4"
              >
                <Wheel
                  segments={segments}
                  rotation={rotation}
                  isSpinning={isSpinning}
                  size={typeof window !== 'undefined' && window.innerWidth < 640 ? 300 : 380}
                />
              </motion.div>

              {/* Кнопки управления */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-4 ml-20"
              >
                <Button
                  onClick={handleSpin}
                  disabled={isSpinning || segments.length < 2 || !canSpin}
                  size="lg"
                  className={`px-8 py-6 text-base font-semibold ${
                    isSpinning || !canSpin
                      ? 'bg-[#555555] cursor-not-allowed text-[#999999] rounded-[10px]'
                      : 'btn-primary text-white'
                  }`}
                >
                  {isSpinning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mr-2"
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      ВРАЩЕНИЕ...
                    </>
                  ) : !canSpin ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      ПОПЫТКИ ЗАКОНЧИЛИСЬ
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      КРУТИТЬ КОЛЕСО
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleReset}
                  disabled={isSpinning}
                  size="lg"
                  className="py-6 px-6 btn-secondary text-[#999999] hover:text-white rounded-[10px]"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </motion.div>

              {/* Статистика */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 flex gap-6 text-sm text-[#666666]"
              >
                {isSignedIn && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 ${spinsLeft > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>Попыток: <span className="text-white font-medium">{spinsLeft}/{maxSpins}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#FF8C00]"></div>
                  <span>Попыток: <span className="text-white font-medium">{spinCount}</span></span>
                </div>
                {winner && !showResult && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#FFB347]"></div>
                    <span>Последний: <span className="text-white font-medium">{winner.label}</span></span>
                  </div>
                )}
              </motion.div>
            </div>


          </div>
        </div>
      </main>

      {/* Модальное окно с призами */}
      <AnimatePresence>
        {showPrizes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowPrizes(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <Card className="bg-[#2A2A2A] border border-[#444444] rounded-[10px]">
                <CardHeader className="pb-3 relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPrizes(false)}
                    className="absolute right-4 top-4 text-[#666666] hover:text-white rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center justify-between pr-12">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-b from-[#FFA500] to-[#FF8C00] flex items-center justify-center rounded-[8px]">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-white font-bold tracking-wide">
                          ПРИЗЫ
                        </CardTitle>
                        <p className="text-sm text-[#666666] mt-0.5">
                          {segments.length} {segments.length === 1 ? 'приз' : segments.length < 5 ? 'приза' : 'призов'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar px-6 pb-6">
                    <div className="space-y-2">
                      {segments.map((segment, index) => (
                        <div 
                          key={segment.id}
                          className="flex items-center gap-3 p-3 bg-[#333333] rounded-[8px] hover:bg-[#3A3A3A] transition-colors"
                        >
                          <div className="number-badge rounded-[4px] min-w-[28px] text-center py-1">
                            {index + 1}
                          </div>
                          <div 
                            className="w-5 h-5 rounded-[4px] flex-shrink-0"
                            style={{ backgroundColor: segment.color }}
                          />
                          <span className="text-white text-sm flex-1 truncate">{segment.label}</span>
                        </div>
                      ))}
                      {segments.length === 0 && (
                        <div className="text-center text-[#666666] py-12">
                          <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Призы не добавлены</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно с результатом */}
      <AnimatePresence>
        {showResult && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-md bg-[#2A2A2A] border-2 border-[#FF8C00] winner-glow rounded-[10px]">
                <CardHeader className="text-center pb-2 relative">
                  {/* Кнопка закрытия */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowResult(false)}
                    className="absolute right-4 top-4 text-[#666666] hover:text-white rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                    className="mx-auto mb-4"
                  >
                    <div className="w-20 h-20 bg-gradient-to-b from-[#FFA500] to-[#FF8C00] flex items-center justify-center rounded-[10px]">
                      <Trophy className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>
                  <CardTitle className="text-2xl text-white font-bold tracking-wide">
                    ПОЗДРАВЛЯЕМ!
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div
                        className="w-4 h-4"
                        style={{ backgroundColor: winner.color }}
                      />
                      <span className="text-2xl font-bold text-white uppercase tracking-wide">
                        {winner.label}
                      </span>
                    </div>
                    <p className="text-[#999999]">
                      Вы выиграли отличный приз!
                    </p>
{isSignedIn && (
                      <p className="text-[#FF8C00] text-sm mt-2">
                        Осталось попыток: {spinsLeft} из {maxSpins}
                      </p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col gap-3"
                  >
                    <Button
                      onClick={() => setShowResult(false)}
                      className="w-full btn-primary text-white font-semibold py-6 text-base"
                    >
                      Забрать приз
                    </Button>
                    {canSpin && (
                      <Button
                        onClick={() => {
                          setShowResult(false);
                          setTimeout(handleSpin, 100);
                        }}
                        className="w-full btn-secondary text-[#999999] hover:text-white font-medium py-5"
                      >
                        Крутить ещё раз
                      </Button>
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Футер */}
      <footer className="border-t border-[#444444] bg-[#2A2A2A]/95 backdrop-blur-sm py-4 relative z-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-[#666666] text-sm">
            Колесо Фортуны • Честная взвешенная случайность
          </p>
        </div>
      </footer>
    </div>
  );
}
