import React from 'react';
import { CheckCircle2, HelpCircle, AlertTriangle, Award, AlertCircle } from 'lucide-react';
import { VacancyAnalysis as AnalysisType } from '../types';

interface VacancyAnalysisProps {
  analysis: AnalysisType;
}

export const VacancyAnalysis: React.FC<VacancyAnalysisProps> = ({ analysis }) => {
  return (
    <div className="space-y-3.5 text-sm">
      {/* Что совпадает с вашим опытом */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center gap-2 mb-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Что совпадает с вашим опытом
          </h3>
        </div>
        {analysis.strongMatches.length > 0 ? (
          <ul className="space-y-1.5 text-xs text-slate-200">
            {analysis.strongMatches.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 text-xs mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">Требуется уточнение требований вакансии.</p>
        )}
      </div>

      {/* Какие достижения лучше использовать */}
      <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center gap-2 mb-2.5">
          <Award className="w-4 h-4 text-blue-400 shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            Какие достижения лучше использовать
          </h3>
        </div>
        <ul className="space-y-1.5 text-xs text-slate-200">
          {analysis.recommendedAchievements.map((ach, idx) => (
            <li key={idx} className="flex items-start gap-2 bg-blue-900/30 p-2 rounded-lg border border-blue-700/30">
              <span className="font-semibold text-blue-300 text-xs shrink-0">{idx + 1}.</span>
              <span className="font-medium text-slate-100">{ach}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Что совпадает частично */}
      {analysis.partialMatches.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Что совпадает частично
            </h3>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {analysis.partialMatches.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-400 text-xs mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Что не подтверждено вашим опытом */}
      {analysis.unknownRequirements.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Что не подтверждено вашим опытом
            </h3>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-400">
            {analysis.unknownRequirements.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-slate-500 text-xs mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Нюансы и риски вакансии */}
      {analysis.risks.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Нюансы вакансии
            </h4>
          </div>
          <ul className="space-y-1 text-xs text-slate-400">
            {analysis.risks.map((risk, idx) => (
              <li key={idx}>• {risk}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
