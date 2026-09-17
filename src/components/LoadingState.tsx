import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

const STEPS = [
  'Извлекаем требования и обязанности вакансии...',
  'Сопоставляем с 8 годами опыта в B2B продажах...',
  'Подбираем релевантные кейсы (Avito, VK, QSoft, Самолет)...',
  'Формируем естественное сопроводительное без штампов...'
];

export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % STEPS.length);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-sm space-y-4 my-2">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-blue-500 animate-spin flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-blue-400 animate-pulse" />
        </div>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-slate-100">
          {message || 'Анализируем вакансию'}
        </h3>
        <p className="text-xs text-blue-400 min-h-[2.5rem] flex items-center justify-center px-4 font-medium transition-all duration-300">
          {STEPS[stepIdx]}
        </p>
      </div>

      <div className="flex justify-center gap-1.5 pt-2">
        {STEPS.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 rounded-full transition-all duration-300 ${
              idx === stepIdx ? 'w-5 bg-blue-500' : 'w-1.5 bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
