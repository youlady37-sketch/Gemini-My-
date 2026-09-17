import React from 'react';
import { Building2, MapPin, Banknote, Briefcase, ExternalLink, RefreshCw } from 'lucide-react';
import { VacancyData } from '../types';

interface VacancyHeaderProps {
  vacancy: VacancyData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const VacancyHeader: React.FC<VacancyHeaderProps> = ({
  vacancy,
  onRefresh,
  isRefreshing = false
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-950/80 text-red-400 border border-red-800/40">
            hh.ru
          </span>
          {vacancy.vacancyId && (
            <span className="text-xs text-slate-400 font-mono">
              #{vacancy.vacancyId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Обновить данные со страницы"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {vacancy.url && (
            <a
              href={vacancy.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Открыть на hh.ru"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      <h2 className="text-base font-semibold text-white leading-snug mb-2">
        {vacancy.title}
      </h2>

      <div className="space-y-1.5 text-xs text-slate-300">
        {vacancy.company && (
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-200">{vacancy.company}</span>
          </div>
        )}

        {vacancy.salary && (
          <div className="flex items-center gap-2">
            <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 font-medium">{vacancy.salary}</span>
          </div>
        )}

        {vacancy.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{vacancy.location}</span>
          </div>
        )}

        {(vacancy.employmentType || vacancy.schedule) && (
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {[vacancy.employmentType, vacancy.schedule].filter(Boolean).join(' • ')}
            </span>
          </div>
        )}
      </div>

      {vacancy.skills && vacancy.skills.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-1.5">
          {vacancy.skills.slice(0, 6).map((skill, idx) => (
            <span
              key={idx}
              className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700/60"
            >
              {skill}
            </span>
          ))}
          {vacancy.skills.length > 6 && (
            <span className="text-[11px] px-1.5 py-0.5 text-slate-400">
              +{vacancy.skills.length - 6}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
