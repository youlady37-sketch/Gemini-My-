import { VacancyData, VacancyAnalysis, HistoryItem, UserProfile } from '../types';
import { defaultUserProfile } from '../data/userProfile';

const STORAGE_KEYS = {
  CURRENT_VACANCY: 'hh_reply_ai_current_vacancy',
  ANALYSIS: 'hh_reply_ai_analysis',
  HISTORY: 'hh_reply_ai_history',
  USER_PROFILE: 'hh_reply_ai_profile',
  SETTINGS: 'hh_reply_ai_settings'
};

const isExtensionEnv = typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;

class StorageService {
  async getCurrentVacancy(): Promise<VacancyData | null> {
    try {
      if (isExtensionEnv) {
        const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_VACANCY);
        return (result[STORAGE_KEYS.CURRENT_VACANCY] as VacancyData) || null;
      }
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_VACANCY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Failed to get current vacancy from storage', e);
      return null;
    }
  }

  async setCurrentVacancy(vacancy: VacancyData | null): Promise<void> {
    try {
      if (isExtensionEnv) {
        if (vacancy) {
          await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_VACANCY]: vacancy });
        } else {
          await chrome.storage.local.remove(STORAGE_KEYS.CURRENT_VACANCY);
        }
        return;
      }
      if (vacancy) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_VACANCY, JSON.stringify(vacancy));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_VACANCY);
      }
    } catch (e) {
      console.error('Failed to set current vacancy in storage', e);
    }
  }

  async getAnalysis(vacancyId: string): Promise<VacancyAnalysis | null> {
    try {
      const key = `${STORAGE_KEYS.ANALYSIS}_${vacancyId}`;
      if (isExtensionEnv) {
        const result = await chrome.storage.local.get(key);
        return (result[key] as VacancyAnalysis) || null;
      }
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Failed to get analysis from storage', e);
      return null;
    }
  }

  async saveAnalysis(vacancyId: string, analysis: VacancyAnalysis): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.ANALYSIS}_${vacancyId}`;
      if (isExtensionEnv) {
        await chrome.storage.local.set({ [key]: analysis });
        return;
      }
      localStorage.setItem(key, JSON.stringify(analysis));
    } catch (e) {
      console.error('Failed to save analysis in storage', e);
    }
  }

  async getHistory(): Promise<HistoryItem[]> {
    try {
      if (isExtensionEnv) {
        const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
        return (result[STORAGE_KEYS.HISTORY] as HistoryItem[]) || [];
      }
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to get history from storage', e);
      return [];
    }
  }

  async addToHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>): Promise<void> {
    try {
      const history = await this.getHistory();
      const newItem: HistoryItem = {
        ...item,
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString()
      };

      // Сохраняем максимум последние 20 вакансий
      const updated = [newItem, ...history.filter(h => h.vacancyId !== item.vacancyId)].slice(0, 20);

      if (isExtensionEnv) {
        await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated });
        return;
      }
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to add to history', e);
    }
  }

  async removeFromHistory(id: string): Promise<HistoryItem[]> {
    try {
      const history = await this.getHistory();
      const updated = history.filter(item => item.id !== id);
      if (isExtensionEnv) {
        await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated });
        return updated;
      }
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Failed to remove from history', e);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    try {
      if (isExtensionEnv) {
        await chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
        return;
      }
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  }

  async getUserProfile(): Promise<UserProfile> {
    try {
      if (isExtensionEnv) {
        const result = await chrome.storage.local.get(STORAGE_KEYS.USER_PROFILE);
        return (result[STORAGE_KEYS.USER_PROFILE] as UserProfile) || defaultUserProfile;
      }
      const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return raw ? JSON.parse(raw) : defaultUserProfile;
    } catch (e) {
      return defaultUserProfile;
    }
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      if (isExtensionEnv) {
        await chrome.storage.local.set({ [STORAGE_KEYS.USER_PROFILE]: profile });
        return;
      }
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  }

  async resetUserProfile(): Promise<UserProfile> {
    await this.saveUserProfile(defaultUserProfile);
    return defaultUserProfile;
  }
}

export const storageService = new StorageService();
