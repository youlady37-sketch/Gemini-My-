import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { Trash2, Copy, Check, Building2, Calendar, FileText, ArrowRight } from 'lucide-react';
import { copyToClipboard } from '../utils/formatter';

interface HistoryListProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  onSelect,
  onDelete,
  onClear
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
        <FileText className="w-8 h-8 mx-auto text-slate-600 mb-1" />
        <p className="text-xs">История пока пуста.</p>
        <p className="text-[11px] text-slate-500">
          Сгенерированные сопроводительные письма будут сохраняться здесь (до 20 записей).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-slate-400">
          Сохранено {items.length} из 20
        </span>
        <button
          onClick={onClear}
          className="text-[11px] text-slate-500 hover:text-red-400 transition"
        >
          Очистить все
        </button>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition cursor-pointer group shadow-sm"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h4 className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 transition line-clamp-1">
                {item.vacancyTitle}
              </h4>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => handleCopy(item.id, item.coverLetter, e)}
                  title="Копировать письмо"
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  title="Удалить из истории"
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
              {item.company && (
                <span className="flex items-center gap-1 text-slate-300">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {item.company}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 line-clamp-2 italic bg-slate-950/60 p-2 rounded border border-slate-800/60">
              "{item.coverLetter.substring(0, 140)}..."
            </p>

            <div className="mt-2 flex items-center justify-end text-[11px] text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform">
              <span>Открыть в редакторе</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
