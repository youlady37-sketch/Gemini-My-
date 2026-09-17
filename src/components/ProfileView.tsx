import React from 'react';
import { UserProfile } from '../types';
import { UserCheck, Award, Briefcase, Phone, Send, ExternalLink, RotateCcw } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onReset: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onReset }) => {
  return (
    <div className="space-y-3.5 text-xs text-slate-200">
      {/* Главная карточка */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-semibold text-sm">
              ТП
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{profile.name}</h3>
              <p className="text-xs text-blue-400 font-medium">{profile.targetPosition}</p>
            </div>
          </div>
          <button
            onClick={onReset}
            title="Сбросить профиль к исходному"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase text-slate-400 font-medium">Стаж в продажах</span>
            <div className="text-sm font-semibold text-white mt-0.5">{profile.salesExperienceYears} лет</div>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase text-slate-400 font-medium">B2B продажи</span>
            <div className="text-sm font-semibold text-emerald-400 mt-0.5">{profile.b2bExperienceYears}+ лет</div>
          </div>
        </div>
      </div>

      {/* Направления */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-2">
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-blue-400" />
          <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Ключевые направления
          </h4>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profile.specializations.map((spec, idx) => (
            <span
              key={idx}
              className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700/60"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>

      {/* Факты и достижения */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            База достижений для подбора
          </h4>
        </div>
        <ul className="space-y-1.5">
          {profile.keyAchievements.map((ach, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>{ach}</span>
            </li>
          ))}
        </ul>
        <div className="p-2 bg-slate-950/80 rounded border border-slate-800 text-[10px] text-slate-400">
          🔒 AI использует только эти подтвержденные факты и никогда не выдумывает опыт.
        </div>
      </div>

      {/* Контакты */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-2">
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Контактный блок
          </h4>
        </div>
        <div className="space-y-1 text-slate-300 bg-slate-950/80 p-2.5 rounded font-mono text-[11px] border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Telegram:</span>
            <a
              href={profile.contacts.telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1"
            >
              {profile.contacts.telegramHandle}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Телефон:</span>
            <span>{profile.contacts.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Имя:</span>
            <span>{profile.contacts.displayName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
