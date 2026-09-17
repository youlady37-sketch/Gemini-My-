import React, { useState } from 'react';
import { SidePanelApp } from './sidepanel/App';
import { sampleVacancies } from './data/mockVacancies';
import { VacancyData } from './types';
import { storageService } from './services/storageService';
import {
  Download,
  ExternalLink,
  CheckCircle2,
  Layers,
  Sparkles,
  RefreshCw,
  Copy,
  ChevronRight,
  Monitor,
  Terminal,
  FileCode,
  ShieldCheck,
  Building2,
  MapPin,
  Banknote,
  Briefcase
} from 'lucide-react';
import JSZip from 'jszip';

export default function App() {
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(400);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipDownloaded, setZipDownloaded] = useState(false);
  const [activeView, setActiveView] = useState<'preview' | 'instructions' | 'manifest'>('preview');

  const activeVacancy = sampleVacancies[selectedSampleIndex];

  const handleSelectVacancy = async (index: number) => {
    setSelectedSampleIndex(index);
    const vac = sampleVacancies[index];
    await storageService.setCurrentVacancy(vac);
    // Отправляем событие, чтобы SidePanel обновился
    window.dispatchEvent(new CustomEvent('hh_vacancy_changed', { detail: vac }));
  };

  const handleDownloadExtensionZip = async () => {
    setIsGeneratingZip(true);
    try {
      const zip = new JSZip();

      // Добавляем manifest.json
      const manifestRes = await fetch('/manifest.json');
      const manifestText = await manifestRes.text();
      zip.file('manifest.json', manifestText);

      // Добавляем sidepanel.html
      const sidepanelHtml = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HH Reply AI — Side Panel</title>
    <link rel="stylesheet" href="assets/sidepanel.css" />
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">
    <div id="sidepanel-root"></div>
    <script type="module" src="assets/sidepanel.js"></script>
  </body>
</html>`;
      zip.file('sidepanel.html', sidepanelHtml);

      // Добавляем README
      const readmeRes = await fetch('/README.md');
      if (readmeRes.ok) {
        const readmeText = await readmeRes.text();
        zip.file('README.md', readmeText);
      }

      // Скачиваем иконки
      const iconsFolder = zip.folder('icons');
      if (iconsFolder) {
        for (const size of [16, 32, 48, 128]) {
          try {
            const iconRes = await fetch(`/icons/icon-${size}.png`);
            if (iconRes.ok) {
              const blob = await iconRes.blob();
              iconsFolder.file(`icon-${size}.png`, blob);
            }
          } catch (e) {
            console.warn(`Icon ${size} fetch skipped`);
          }
        }
      }

      // Генерируем архив
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hh-reply-ai-extension.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setZipDownloaded(true);
      setTimeout(() => setZipDownloaded(false), 4000);
    } catch (err) {
      console.error('Failed to create zip', err);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Верхняя навигационная панель стенда */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/90 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-base shadow-md font-bold">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">HH Reply AI</span>
              <span className="text-[11px] font-medium bg-blue-950/80 text-blue-400 border border-blue-800/60 px-2 py-0.5 rounded-full">
                Chrome Extension Manifest V3
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Рабочий стенд расширения & симулятор Side Panel для hh.ru
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveView('preview')}
              className={`px-3 py-1 rounded-md transition ${
                activeView === 'preview' ? 'bg-blue-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Стенд + Side Panel
            </button>
            <button
              onClick={() => setActiveView('instructions')}
              className={`px-3 py-1 rounded-md transition ${
                activeView === 'instructions' ? 'bg-blue-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Инструкция (Chrome)
            </button>
            <button
              onClick={() => setActiveView('manifest')}
              className={`px-3 py-1 rounded-md transition ${
                activeView === 'manifest' ? 'bg-blue-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              manifest.json
            </button>
          </div>

          <button
            onClick={handleDownloadExtensionZip}
            disabled={isGeneratingZip}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
              zipDownloaded
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
            }`}
          >
            {zipDownloaded ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Архив скачан!</span>
              </>
            ) : (
              <>
                <Download className={`w-3.5 h-3.5 ${isGeneratingZip ? 'animate-bounce' : ''}`} />
                <span>{isGeneratingZip ? 'Сборка архива...' : 'Скачать unpacked (.ZIP)'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Рабочая область */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'preview' && (
          <>
            {/* Левая половина: Симулятор страницы вакансии на hh.ru */}
            <section className="flex-1 flex flex-col bg-slate-900/50 border-r border-slate-800/80 overflow-hidden">
              {/* Панель выбора тестовой вакансии на hh.ru */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto text-xs py-0.5">
                  <span className="text-slate-400 text-xs shrink-0 font-medium">Страница hh.ru:</span>
                  {sampleVacancies.map((sample, idx) => (
                    <button
                      key={sample.vacancyId}
                      onClick={() => handleSelectVacancy(idx)}
                      className={`px-2.5 py-1 rounded-md transition text-xs truncate max-w-[200px] border ${
                        selectedSampleIndex === idx
                          ? 'bg-blue-600 text-white font-medium border-blue-500 shadow-xs'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {sample.company}: {sample.title}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400">Ширина панели:</span>
                  <div className="flex bg-slate-950 rounded border border-slate-800 p-0.5 text-[11px]">
                    {[360, 400, 460].map((w) => (
                      <button
                        key={w}
                        onClick={() => setSidePanelWidth(w)}
                        className={`px-2 py-0.5 rounded ${
                          sidePanelWidth === w ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Макет открытой страницы вакансии на hh.ru */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-3xl mx-auto w-full">
                {/* Имитация URL-бара браузера Chrome */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-500">https://</span>
                  <span className="text-slate-200">hh.ru</span>
                  <span className="text-blue-400">/vacancy/{activeVacancy.vacancyId}</span>
                </div>

                {/* Карточка вакансии с семантическими data-qa атрибутами hh.ru */}
                <div
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
                  data-qa="vacancy-view"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-red-400 bg-red-950/60 border border-red-900/50 px-2.5 py-0.5 rounded-full">
                        Вакансия на hh.ru
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        ID: {activeVacancy.vacancyId}
                      </span>
                    </div>

                    <h1
                      data-qa="vacancy-title"
                      className="text-xl font-bold text-white tracking-tight leading-snug"
                    >
                      {activeVacancy.title}
                    </h1>

                    {activeVacancy.salary && (
                      <div
                        data-qa="vacancy-salary"
                        className="text-lg font-semibold text-emerald-400 flex items-center gap-1.5"
                      >
                        <Banknote className="w-5 h-5" />
                        <span>{activeVacancy.salary}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center gap-2" data-qa="vacancy-company-name">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-100">{activeVacancy.company}</span>
                    </div>

                    <div className="flex items-center gap-2" data-qa="vacancy-view-location">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{activeVacancy.location}</span>
                    </div>

                    <div className="flex items-center gap-2 col-span-2" data-qa="vacancy-view-employment-mode">
                      <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{[activeVacancy.employmentType, activeVacancy.schedule].filter(Boolean).join(' • ')}</span>
                    </div>
                  </div>

                  {/* Описание */}
                  <div className="space-y-3 text-xs leading-relaxed text-slate-300" data-qa="vacancy-description">
                    <p>{activeVacancy.description}</p>

                    <div>
                      <h3 className="font-semibold text-slate-100 uppercase tracking-wider text-[11px] mb-2">
                        Обязанности:
                      </h3>
                      <ul className="space-y-1 pl-4 list-disc text-slate-300">
                        {activeVacancy.responsibilities.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-100 uppercase tracking-wider text-[11px] mb-2">
                        Требования к кандидату:
                      </h3>
                      <ul className="space-y-1 pl-4 list-disc text-slate-300">
                        {activeVacancy.requirements.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Ключевые навыки */}
                  <div className="pt-2">
                    <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-2">
                      Ключевые навыки:
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {activeVacancy.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          data-qa="bloko-tag__text"
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 text-xs border border-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Правая половина: Реалистичный фрейм Chrome Side Panel */}
            <aside
              style={{ width: `${sidePanelWidth}px` }}
              className="flex flex-col bg-slate-950 border-l border-slate-800 shrink-0 shadow-2xl transition-all duration-150"
            >
              {/* Верхняя рамка Side Panel в стиле Google Chrome */}
              <div className="h-8 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-slate-400 text-[11px] select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="font-medium text-slate-300">Боковая панель Chrome</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{sidePanelWidth}px</span>
              </div>

              {/* Точная копия интерфейса расширения в Side Panel */}
              <div className="flex-1 overflow-hidden">
                <SidePanelApp />
              </div>
            </aside>
          </>
        )}

        {/* Экран: Инструкции по установке расширения в Chrome */}
        {activeView === 'instructions' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-400" />
                <span>Установка HH Reply AI в Google Chrome</span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Расширение разработано по спецификации Chrome Manifest V3 с использованием Side Panel API,
                Content Script для безопасного извлечения данных с hh.ru и Background Service Worker.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                  <Terminal className="w-4 h-4" />
                  <span>Способ 1: Сборка через терминал</span>
                </div>
                <ol className="space-y-2 text-xs text-slate-300 list-decimal pl-4 leading-relaxed">
                  <li>Откройте папку проекта в терминале.</li>
                  <li>
                    Выполните команду:
                    <pre className="mt-1 bg-slate-950 p-2 rounded text-emerald-400 font-mono text-[11px]">
                      npm install && npm run build
                    </pre>
                  </li>
                  <li>
                    После завершения появится папка <code className="text-blue-300">dist</code> со всеми файлами (manifest.json, sidepanel.html, background.js, content.js).
                  </li>
                  <li>
                    В Chrome перейдите по адресу:
                    <pre className="mt-1 bg-slate-950 p-2 rounded text-blue-300 font-mono text-[11px]">
                      chrome://extensions
                    </pre>
                  </li>
                  <li>Включите переключатель <strong>Developer mode</strong> (Режим разработчика) в правом верхнем углу.</li>
                  <li>Нажмите <strong>Load unpacked</strong> (Загрузить распакованное расширение) и выберите папку <strong>dist</strong>.</li>
                </ol>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Download className="w-4 h-4" />
                  <span>Способ 2: Скачать ZIP в 1 клик</span>
                </div>
                <ol className="space-y-2 text-xs text-slate-300 list-decimal pl-4 leading-relaxed">
                  <li>
                    Нажмите синюю кнопку в правом верхнем углу <strong>"Скачать unpacked (.ZIP)"</strong>.
                  </li>
                  <li>Распакуйте скачанный zip-архив в любую удобную папку на компьютере.</li>
                  <li>
                    Откройте в Google Chrome страницу:
                    <pre className="mt-1 bg-slate-950 p-2 rounded text-blue-300 font-mono text-[11px]">
                      chrome://extensions
                    </pre>
                  </li>
                  <li>Активируйте <strong>Developer mode</strong>.</li>
                  <li>Нажмите <strong>Load unpacked</strong> и укажите распакованную папку.</li>
                  <li>
                    Готово! Откройте любую вакансию на <strong>hh.ru/vacancy/...</strong> и кликните на иконку расширения в панели Chrome — откроется Side Panel.
                  </li>
                </ol>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Чеклист проверки работы на hh.ru
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Страница hh.ru открывается штатно</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Вакансия и ID распознаются мгновенно</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Компания, оклад, требования извлекаются</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Side Panel открывается в боковой панели</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Письмо генерируется без клише</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Кнопка "Копировать" копирует чистый текст</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Экран: Просмотр manifest.json */}
        {activeView === 'manifest' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <span>Manifest V3 Конфигурация</span>
              </h2>
              <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                Valid Manifest V3
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
              <pre>{`{
  "manifest_version": 3,
  "name": "HH Reply AI",
  "version": "1.0.0",
  "description": "Личный AI-помощник для анализа вакансий на hh.ru и создания персонализированных сопроводительных писем",
  "permissions": [
    "sidePanel",
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://hh.ru/*",
    "https://*.hh.ru/*"
  ],
  "action": {
    "default_title": "Открыть HH Reply AI",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://hh.ru/*",
        "https://*.hh.ru/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
