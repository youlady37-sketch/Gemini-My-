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

        // Проверяем, что это страница вакансии на hh.ru
        const isHhVacancy = activeTab.url.includes('hh.ru/vacancy/') || activeTab.url.includes('hh.ru/vacancy?');
        if (!isHhVacancy) {
          // Если мы не на вакансии, очищаем текущую вакансию
          await storageService.setCurrentVacancy(null);
          return null;
        }

        // Отправляем сообщение content script
        const response = await new Promise<VacancyData | null>((resolve) => {
          chrome.tabs.sendMessage(
            activeTab.id!,
            { type: 'REQUEST_VACANCY_EXTRACT' },
            (res) => {
              if (chrome.runtime.lastError) {
                // Если скрипт еще не успел внедриться, можно попробовать прочитать из storage
                storageService.getCurrentVacancy().then(resolve);
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
      } catch (err) {
        console.warn('Error querying tab for vacancy data:', err);
      }
    }

    // Fallback: читаем сохраненную вакансию из хранилища
    return await storageService.getCurrentVacancy();
  }
}

export const vacancyService = new VacancyService();
