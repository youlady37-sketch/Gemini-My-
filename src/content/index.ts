import { extractVacancyFromDocument } from './extractor';
import { ExtensionMessage, VacancyData } from '../types';

let currentVacancyCache: VacancyData | null = null;
let lastUrl = window.location.href;
let badgeElement: HTMLElement | null = null;

function isVacancyUrl(url: string): boolean {
  return url.includes('hh.ru/vacancy/') || url.includes('/vacancy/');
}

/**
 * Основной цикл проверки и извлечения вакансии
 */
function processCurrentPage() {
  const currentUrl = window.location.href;
  if (!isVacancyUrl(currentUrl)) {
    removeBadge();
    currentVacancyCache = null;
    return;
  }

  const vacancy = extractVacancyFromDocument(document, currentUrl);
  if (vacancy && vacancy.title) {
    currentVacancyCache = vacancy;

    // Сохраняем в chrome.storage.local
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ hh_reply_ai_current_vacancy: vacancy });
    }

    // Оповещаем background worker
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'VACANCY_DETECTED',
          payload: vacancy
        } as ExtensionMessage);
      } catch (err) {
        // Контекст расширения может быть недоступен при перезагрузке
      }
    }

    injectOrUpdateBadge(vacancy);
  }
}

/**
 * Ненавязчивый значок в правом нижнем углу hh.ru
 * Не ломает верстку сайта, дает быстрый доступ к информации
 */
function injectOrUpdateBadge(vacancy: VacancyData) {
  if (document.getElementById('hh-reply-ai-badge')) {
    return;
  }

  badgeElement = document.createElement('div');
  badgeElement.id = 'hh-reply-ai-badge';
  badgeElement.setAttribute(
    'style',
    'position: fixed; bottom: 24px; right: 24px; z-index: 999999; ' +
    'background: #0f172a; color: #ffffff; border: 1px solid rgba(255,255,255,0.15); ' +
    'padding: 10px 16px; border-radius: 9999px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; ' +
    'font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; ' +
    'box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); transition: transform 0.2s ease, background 0.2s ease;'
  );

  badgeElement.innerHTML = `
    <span style="font-size: 15px;">✨</span>
    <span>HH Reply AI: <strong>${vacancy.company ? vacancy.company.substring(0, 18) : 'Вакансия'}</strong></span>
    <span style="background: #2563eb; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 12px; margin-left: 4px;">Side Panel</span>
  `;

  badgeElement.addEventListener('mouseenter', () => {
    badgeElement!.style.transform = 'translateY(-2px)';
  });
  badgeElement.addEventListener('mouseleave', () => {
    badgeElement!.style.transform = 'translateY(0)';
  });

  badgeElement.addEventListener('click', () => {
    // Отправляем запрос на открытие Side Panel
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' } as ExtensionMessage);
    }
  });

  document.body.appendChild(badgeElement);
}

function removeBadge() {
  const el = document.getElementById('hh-reply-ai-badge');
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

/**
 * Обработка сообщений от Side Panel или Background Service Worker
 */
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'REQUEST_VACANCY_EXTRACT') {
      const vacancy = extractVacancyFromDocument(document, window.location.href);
      if (vacancy) {
        currentVacancyCache = vacancy;
        sendResponse(vacancy);
      } else {
        sendResponse(currentVacancyCache);
      }
      return true;
    }
  });
}

/**
 * Отслеживание SPA-навигации на hh.ru
 */
function observeNavigation() {
  // 1. MutationObserver для динамически подгружаемого DOM
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      processCurrentPage();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 2. Отслеживание изменения history (pushState, replaceState, popstate)
  window.addEventListener('popstate', () => {
    processCurrentPage();
  });

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(processCurrentPage, 300);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(processCurrentPage, 300);
  };
}

// Запуск при загрузке документа
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(processCurrentPage, 500);
    observeNavigation();
  });
} else {
  setTimeout(processCurrentPage, 300);
  observeNavigation();
}
