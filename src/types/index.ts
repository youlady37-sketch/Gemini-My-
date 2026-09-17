export interface VacancyData {
  vacancyId: string | null;
  url: string;
  title: string;
  company: string | null;
  description: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  salary: string | null;
  employmentType: string | null;
  schedule: string | null;
  location: string | null;
  extractedAt: string;
}

export interface VacancyAnalysis {
  strongMatches: string[];
  partialMatches: string[];
  unknownRequirements: string[];
  recommendedAchievements: string[];
  risks: string[];
}

export interface UserProfile {
  name: string;
  targetPosition: string;
  salesExperienceYears: number;
  b2bExperienceYears: number;
  specializations: string[];
  keyAchievements: string[];
  contacts: {
    telegramHandle: string;
    phone: string;
    displayName: string;
    telegramUrl: string;
  };
}

export type RewriteMode =
  | 'default'
  | 'shorter'
  | 'livelier'
  | 'more_concrete'
  | 'business_focused'
  | 'anti_bureaucracy';

export interface GeneratedCoverLetter {
  id: string;
  vacancyId: string | null;
  vacancyTitle: string;
  company: string | null;
  text: string;
  mode: RewriteMode;
  charCount: number;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  vacancyId: string | null;
  vacancyTitle: string;
  company: string | null;
  salary: string | null;
  location: string | null;
  coverLetter: string;
  createdAt: string;
}

export type AppState =
  | 'NO_VACANCY'       // Состояние 1: Не открыта вакансия
  | 'VACANCY_FOUND'    // Состояние 2: Вакансия найдена
  | 'ANALYZING'        // Состояние 3: Вакансия анализируется
  | 'ANALYSIS_DONE'    // Состояние 4: Анализ завершён
  | 'LETTER_READY'     // Состояние 5: Готово сопроводительное
  | 'ERROR';

export interface ExtensionMessage {
  type:
    | 'VACANCY_DETECTED'
    | 'GET_CURRENT_VACANCY'
    | 'REQUEST_VACANCY_EXTRACT'
    | 'OPEN_SIDE_PANEL'
    | 'VACANCY_DATA_RESPONSE';
  payload?: any;
}
