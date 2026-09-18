import { VacancyData } from '../types';
import { storageService } from './storageService';

class VacancyService {
  /**
   * Запрос текущей вакансии из активной вкладки Chrome
   */
  async fetchCurrentVacancyFromTab(): Promise<VacancyData | null> {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id || !activeTab.url) {
          return null;
        }

        const isHhVacancy = activeTab.url.includes('hh.ru/vacancy/') || activeTab.url.includes('hh.ru/vacancy?');
        if (!isHhVacancy) {
          await storageService.setCurrentVacancy(null);
          return null;
        }

        const response = await new Promise<VacancyData | null>((resolve) => {
          chrome.tabs.sendMessage(
            activeTab.id!,
            { type: 'REQUEST_VACANCY_EXTRACT' },
            (res) => {
              if (chrome.runtime.lastError) {
                resolve(null);
                return;
              }
              resolve(res || null);
            }
          );
        });

        if (response) {
          await storageService.setCurrentVacancy(response);
          return response;
        }

        return null;
      } catch (err) {
        console.warn('Error querying tab for vacancy data:', err);
        return null;
      }
    }

    // Fallback: читаем сохраненную вакансию из хранилища только для Web/preview режима
    return await storageService.getCurrentVacancy();
  }
}

export const vacancyService = new VacancyService();
