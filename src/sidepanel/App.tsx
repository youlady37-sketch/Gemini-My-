import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Search,
  FileCheck,
  History,
  User,
  AlertCircle,
  ArrowLeft,
  Wand2,
  FileSpreadsheet
} from 'lucide-react';
import {
  VacancyData,
  VacancyAnalysis as AnalysisType,
  AppState,
  RewriteMode,
  HistoryItem,
  UserProfile
} from '../types';
import { storageService } from '../services/storageService';
import { vacancyService } from '../services/vacancyService';
import { aiService } from '../services/aiService';
import { sampleVacancies } from '../data/mockVacancies';

import { VacancyHeader } from '../components/VacancyHeader';
import { VacancyAnalysis } from '../components/VacancyAnalysis';
import { CoverLetter } from '../components/CoverLetter';
import { ActionButtons } from '../components/ActionButtons';
import { LoadingState } from '../components/LoadingState';
import { HistoryList } from '../components/HistoryList';
import { ProfileView } from '../components/ProfileView';

type Tab = 'assistant' | 'history' | 'profile';

export const SidePanelApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('assistant');
  const [appState, setAppState] = useState<AppState>('NO_VACANCY');
  const [currentVacancy, setCurrentVacancy] = useState<VacancyData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisType | null>(null);
  const [coverLetterText, setCoverLetterText] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<RewriteMode>('default');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      const [profile, history, storedVacancy] = await Promise.all([
        storageService.getUserProfile(),
        storageService.getHistory(),
        storageService.getCurrentVacancy()
      ]);

      setUserProfile(profile);
      setHistoryItems(history);

      const isExtension = typeof chrome !== 'undefined' && !!chrome.tabs && !!chrome.tabs.query;
      const liveVacancy = await vacancyService.fetchCurrentVacancyFromTab();
      const targetVacancy = isExtension ? liveVacancy : (liveVacancy || storedVacancy);

      if (targetVacancy && targetVacancy.title) {
        setCurrentVacancy(targetVacancy);
        setAppState('VACANCY_FOUND');

        if (targetVacancy.vacancyId) {
          const cachedAnalysis = await storageService.getAnalysis(targetVacancy.vacancyId);
          if (cachedAnalysis) setAnalysis(cachedAnalysis);
        }
      } else {
        setCurrentVacancy(null);
        setAppState('NO_VACANCY');
      }
    } catch (err) {
      console.error('Failed to init sidepanel:', err);
      setCurrentVacancy(null);
      setAppState('NO_VACANCY');
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      const messageListener = (message: any) => {
        if (message.type === 'VACANCY_DETECTED' && message.payload) {
          setCurrentVacancy(message.payload);
          setAnalysis(null);
          setCoverLetterText('');
          setAppState('VACANCY_FOUND');
          setErrorMessage(null);
        } else if (message.type === 'VACANCY_CLEARED') {
          setCurrentVacancy(null);
          setAnalysis(null);
          setCoverLetterText('');
          setAppState('NO_VACANCY');
          setErrorMessage(null);
        }
      };
      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, [loadInitialData]);

  const handleAnalyzeAndGenerate = async (targetMode: RewriteMode = 'default') => {
    if (!currentVacancy || !userProfile) return;

    setAppState('ANALYZING');
    setErrorMessage(null);
    setCurrentMode(targetMode);

    try {
      let currentAnalysis = analysis;
      if (!currentAnalysis) {
        currentAnalysis = await aiService.analyzeVacancy(currentVacancy, userProfile);
        setAnalysis(currentAnalysis);
        if (currentVacancy.vacancyId) {
          await storageService.saveAnalysis(currentVacancy.vacancyId, currentAnalysis);
        }
      }

      const letter = await aiService.generateCoverLetter(currentVacancy, userProfile, currentAnalysis, targetMode);
      setCoverLetterText(letter);
      setAppState('LETTER_READY');

      await storageService.addToHistory({
        vacancyId: currentVacancy.vacancyId,
        vacancyTitle: currentVacancy.title,
        company: currentVacancy.company,
        salary: currentVacancy.salary,
        location: currentVacancy.location,
        coverLetter: letter
      });

      const updatedHistory = await storageService.getHistory();
      setHistoryItems(updatedHistory);
    } catch (err) {
      console.error('Error during analysis/generation:', err);
      setErrorMessage('Не удалось завершить генерацию. Пожалуйста, попробуйте еще раз.');
      setAppState('ERROR');
    }
  };

  const handleRewrite = async (mode: RewriteMode) => {
    if (!currentVacancy || !userProfile || !analysis) return;
    setIsRewriting(true);
    setCurrentMode(mode);

    try {
      const letter = await aiService.rewriteCoverLetter(currentVacancy, userProfile, analysis, coverLetterText || '', mode);
      setCoverLetterText(letter);
      setAppState('LETTER_READY');
      setErrorMessage(null);
    } catch (err) {
      console.error('Error during rewrite:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Не удалось переписать текст. Попробуйте еще раз.');
      setAppState('LETTER_READY');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const vacancy = await vacancyService.fetchCurrentVacancyFromTab();
      if (vacancy && vacancy.title) {
        setCurrentVacancy(vacancy);
        setAppState('VACANCY_FOUND');
        setAnalysis(null);
        setCoverLetterText('');
        setErrorMessage(null);
      } else {
        setCurrentVacancy(null);
        setAppState('NO_VACANCY');
      }
    } catch (err) {
      console.error('Error refreshing vacancy:', err);
      setCurrentVacancy(null);
      setAppState('NO_VACANCY');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLoadSample = (sample: VacancyData) => {
    setCurrentVacancy(sample);
    setAnalysis(null);
    setCoverLetterText('');
    setAppState('VACANCY_FOUND');
    setErrorMessage(null);
    storageService.setCurrentVacancy(sample);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setCurrentVacancy({
      vacancyId: item.vacancyId,
      url: item.vacancyId ? `https://hh.ru/vacancy/${item.vacancyId}` : 'https://hh.ru',
      title: item.vacancyTitle,
      company: item.company,
      salary: item.salary,
      location: item.location,
      employmentType: null,
      schedule: null,
      description: item.vacancyTitle,
      requirements: [],
      responsibilities: [],
      skills: [],
      extractedAt: item.createdAt
    });
    setCoverLetterText(item.coverLetter);
    setAppState('LETTER_READY');
    setActiveTab('assistant');
  };

  const handleDeleteHistoryItem = async (id: string) => {
    const updated = await storageService.removeFromHistory(id);
    setHistoryItems(updated);
  };

  const handleClearHistory = async () => {
    await storageService.clearHistory();
    setHistoryItems([]);
  };

  const handleResetProfile = async () => {
    const reset = await storageService.resetUserProfile();
    setUserProfile(reset);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans select-none antialiased">
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">✨</div>
          <div>
            <h1 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              HH Reply AI
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">v1.0</span>
            </h1>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button onClick={() => setActiveTab('assistant')} className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${activeTab === 'assistant' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}>
            <Sparkles className="w-3 h-3" />
            <span>Ассистент</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}>
            <History className="w-3 h-3" />
            <span>История</span>
            {historyItems.length > 0 && <span className="text-[10px] ml-0.5 opacity-80 font-mono">{historyItems.length}</span>}
          </button>
          <button onClick={() => setActiveTab('profile')} className={`px-2 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`} title="Профиль кандидата">
            <User className="w-3 h-3" />
          </button>
        </nav>
      </header>

      <main className="flex-1 p-3.5 space-y-3.5 overflow-y-auto">
        {activeTab === 'history' && (
          <HistoryList items={historyItems} onSelect={handleSelectHistoryItem} onDelete={handleDeleteHistoryItem} onClear={handleClearHistory} />
        )}

        {activeTab === 'profile' && userProfile && <ProfileView profile={userProfile} onReset={handleResetProfile} />}

        {activeTab === 'assistant' && (
          <>
            {errorMessage && (
              <div className="bg-red-950/70 border border-red-800/80 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2 shadow-sm">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{errorMessage}</p>
                  <button onClick={() => handleAnalyzeAndGenerate(currentMode)} className="mt-1.5 text-xs text-red-300 underline font-medium hover:text-white">Попробовать снова</button>
                </div>
              </div>
            )}

            {appState === 'NO_VACANCY' && (
              <div className="space-y-4 py-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center mx-auto shadow-inner"><Search className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Откройте вакансию на hh.ru</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">Перейдите на страницу любой вакансии hh.ru, и расширение автоматически распознает требования.</p>
                  </div>
                  <div className="pt-2">
                    <button onClick={handleRefresh} disabled={isRefreshing} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-2 px-3 rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Проверить активную страницу</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300"><FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" /><span>Быстрый тест на примерах:</span></div>
                  <div className="space-y-1.5">
                    {sampleVacancies.map((sample) => (
                      <button key={sample.vacancyId} onClick={() => handleLoadSample(sample)} className="w-full text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition group">
                        <div className="text-xs font-medium text-slate-200 group-hover:text-blue-300 line-clamp-1">{sample.title}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5"><span className="font-semibold text-slate-300">{sample.company}</span>{sample.salary && <span>• {sample.salary}</span>}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentVacancy && appState !== 'NO_VACANCY' && (
              <div className="space-y-3.5">
                <VacancyHeader vacancy={currentVacancy} onRefresh={handleRefresh} isRefreshing={isRefreshing} />

                {appState === 'VACANCY_FOUND' && (
                  <div className="space-y-2.5">
                    <button onClick={() => handleAnalyzeAndGenerate('default')} className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      <span>Разобрать вакансию и создать письмо</span>
                    </button>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                      <div className="font-medium text-slate-300">Принцип генерации:</div>
                      <div>• Выбирает только релевантные факты из вашего опыта B2B</div>
                      <div>• Звучит естественно и живо, без шаблонного канцелярита</div>
                      <div>• Включает контактный блок @tattytoo</div>
                    </div>
                  </div>
                )}

                {appState === 'ANALYZING' && <LoadingState />}

                {(appState === 'ANALYSIS_DONE' || appState === 'LETTER_READY') && (
                  <div className="space-y-3.5">
                    {coverLetterText && <CoverLetter text={coverLetterText} onTextChange={(newTxt) => setCoverLetterText(newTxt)} mode={currentMode} charCount={coverLetterText.length} />}
                    <ActionButtons currentMode={currentMode} onRewrite={handleRewrite} isLoading={isRewriting} />
                    {analysis && (
                      <div className="pt-1">
                        <div className="flex items-center gap-2 mb-2 px-1"><FileCheck className="w-3.5 h-3.5 text-slate-400" /><h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Детали анализа вакансии</h4></div>
                        <VacancyAnalysis analysis={analysis} />
                      </div>
                    )}
                    <div className="pt-2">
                      <button onClick={() => { setAppState('VACANCY_FOUND'); setCoverLetterText(''); }} className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl border border-slate-800 transition flex items-center justify-center gap-1.5">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>К началу вакансии</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
