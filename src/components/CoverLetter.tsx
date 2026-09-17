import React, { useState } from 'react';
import { Copy, Check, Edit3, Eye, Sparkles } from 'lucide-react';
import { copyToClipboard } from '../utils/formatter';
import { RewriteMode } from '../types';

interface CoverLetterProps {
  text: string;
  onTextChange?: (newText: string) => void;
  mode: RewriteMode;
  charCount: number;
}

const MODE_LABELS: Record<RewriteMode, string> = {
  default: 'Сбалансированное',
  shorter: 'Короткое',
  livelier: 'Живое',
  more_concrete: 'С фактами и цифрами',
  business_focused: 'Про бизнес и LTV',
  anti_bureaucracy: 'Без канцелярита'
};

export const CoverLetter: React.FC<CoverLetterProps> = ({
  text,
  onTextChange,
  mode,
  charCount
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isOptimalLength = charCount >= 450 && charCount <= 1100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Сопроводительное письмо
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-[11px] px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition flex items-center gap-1"
            title={isEditing ? 'Просмотр' : 'Редактировать вручную'}
          >
            {isEditing ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            <span>{isEditing ? 'Готово' : 'Править'}</span>
          </button>

          <button
            onClick={handleCopy}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано' : 'Копировать'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
          Стиль: {MODE_LABELS[mode]}
        </span>
        <span className={`font-mono ${isOptimalLength ? 'text-emerald-400' : 'text-slate-400'}`}>
          {charCount} знаков {isOptimalLength ? '(в норме)' : '(реком. 500–1000)'}
        </span>
      </div>

      {isEditing ? (
        <textarea
          value={text}
          onChange={(e) => onTextChange?.(e.target.value)}
          rows={12}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-blue-500 transition resize-y"
          placeholder="Текст сопроводительного..."
        />
      ) : (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text font-sans">
          {text}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-800/60">
        <span>✓ Без клише и канцелярита</span>
        <span>✓ Контакты Татьяны включены</span>
      </div>
    </div>
  );
};
