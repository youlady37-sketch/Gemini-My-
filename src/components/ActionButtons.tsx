import React from 'react';
import { RefreshCw, Minimize2, Flame, Hash, TrendingUp, ShieldCheck } from 'lucide-react';
import { RewriteMode } from '../types';

interface ActionButtonsProps {
  currentMode: RewriteMode;
  onRewrite: (mode: RewriteMode) => void;
  isLoading: boolean;
}

interface ModeButton {
  mode: RewriteMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODES: ModeButton[] = [
  { mode: 'default', label: 'Переписать', icon: RefreshCw },
  { mode: 'shorter', label: 'Короче', icon: Minimize2 },
  { mode: 'livelier', label: 'Живее', icon: Flame },
  { mode: 'more_concrete', label: 'Больше конкретики', icon: Hash },
  { mode: 'business_focused', label: 'Больше про бизнес', icon: TrendingUp },
  { mode: 'anti_bureaucracy', label: 'Убрать канцелярит', icon: ShieldCheck }
];

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  currentMode,
  onRewrite,
  isLoading
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Варианты адаптации:</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MODES.map(({ mode, label, icon: Icon }) => {
          const isActive = currentMode === mode;
          return (
            <button
              key={mode}
              onClick={() => onRewrite(mode)}
              disabled={isLoading}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition border ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
