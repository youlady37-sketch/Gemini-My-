import { extractVacancyFromDocument } from './extractor';
import { ExtensionMessage, VacancyData } from '../types';

let currentVacancyCache: VacancyData | null = null;
let lastUrl = window.location.href;
let lastVacancyId: string | null = null;
let retryTimer: number | null = null;
let navigationGeneration = 0;
let badgeElement: HTMLElement | null = null;

function isVacancyUrl(url: string): boolean {
  return /https:\/\/[^/]*hh\.ru\/vacancy\/\d+/.test(url) || /\/vacancy\/\d+/.test(url);
}

function getVacancyId(url: string): string | null {
  return url.match(/\/vacancy\/(\d+)/)?.[1] ?? null;
}

function clearCurrentVacancy() {
  navigationGeneration += 1;
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  currentVacancyCache = null;
  lastVacancyId = null;
  removeBadge();
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.remove('hh_reply_ai_current_vacancy').catch(() => undefined);
  }
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      chrome.runtime.sendMessage({ type: 'VACANCY_CLEARED' } as ExtensionMessage);
    } catch {
      // Extension context may not be available.
    }
  }
}

function notifyVacancy(vacancy: VacancyData) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      chrome.runtime.sendMessage({ type: 'VACANCY_DETECTED', payload: vacancy } as ExtensionMessage);
    } catch {
      // Extension context may disappear during an HH.ru reload.
    }
  }
}

function processCurrentPage(attempt = 0, generation = navigationGeneration) {
  if (generation !== navigationGeneration) return;

  const currentUrl = window.location.href;
  const vacancyId = getVacancyId(currentUrl);

  if (!isVacancyUrl(currentUrl) || !vacancyId) {
    clearCurrentVacancy();
    return;
  }

  if (vacancyId !== lastVacancyId) {
    currentVacancyCache = null;
    removeBadge();
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.remove('hh_reply_ai_current_vacancy').catch(() => undefined);
    }
  }

  const vacancy = extractVacancyFromDocument(document, currentUrl);
  if (generation !== navigationGeneration || window.location.href !== currentUrl) return;

  if (vacancy?.title && vacancy.vacancyId === vacancyId) {
    currentVacancyCache = vacancy;
    lastVacancyId = vacancyId;

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ hh_reply_ai_current_vacancy: vacancy }).catch(() => undefined);
    }

    notifyVacancy(vacancy);
    injectOrUpdateBadge(vacancy);
    retryTimer = null;
    return;
  }

  // HH.ru часто рендерит DOM асинхронно после смены URL в SPA.
  if (attempt < 10 && generation === navigationGeneration) {
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      processCurrentPage(attempt + 1, generation);
    }, 350);
  }
}

function injectOrUpdateBadge(vacancy: VacancyData) {
  let badge = document.getElementById('hh-reply-ai-badge') as HTMLElement | null;

  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'hh-reply-ai-badge';
    badge.setAttribute('style',
      'position:fixed;bottom:24px;right:24px;z-index:999999;background:#0f172a;color:#fff;' +
      'border:1px solid rgba(255,255,255,.15);padding:10px 16px;border-radius:9999px;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;' +
      'font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;' +
      'box-shadow:0 10px 25px -5px rgba(0,0,0,.3);transition:transform .2s ease,background .2s ease;'
    );
    badge.title = 'Открыть ассистент HH Reply AI (нажмите значок ✨ в панели расширений Chrome)';
    badge.addEventListener('mouseenter', () => { badge!.style.transform = 'translateY(-2px)'; });
    badge.addEventListener('mouseleave', () => { badge!.style.transform = 'translateY(0)'; });
    badge.addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' } as ExtensionMessage);
      } catch {
        /* noop */
      }
    });
    document.body.appendChild(badge);
  }

  badge.innerHTML = `<span style="font-size:15px">✨</span><span>HH Reply AI: <strong>${escapeHtml(vacancy.company?.substring(0, 18) || 'Вакансия')}</strong></span><span style="background:#2563eb;color:#fff;font-size:11px;padding:2px 7px;border-radius:12px;margin-left:4px">Side Panel</span>`;
  badgeElement = badge;
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function removeBadge() {
  const el = document.getElementById('hh-reply-ai-badge');
  el?.remove();
  badgeElement = null;
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'REQUEST_VACANCY_EXTRACT') {
      const requestUrl = window.location.href;
      const requestVacancyId = getVacancyId(requestUrl);
      const vacancy = requestVacancyId ? extractVacancyFromDocument(document, requestUrl) : null;
      if (vacancy?.vacancyId === requestVacancyId) {
        currentVacancyCache = vacancy;
        lastVacancyId = vacancy.vacancyId;
        sendResponse(vacancy);
      } else if (requestVacancyId && currentVacancyCache?.vacancyId === requestVacancyId) {
        sendResponse(currentVacancyCache);
      } else {
        sendResponse(null);
      }
      return true;
    }
  });
}

function handleNavigation() {
  const url = window.location.href;
  if (url === lastUrl) {
    processCurrentPage();
    return;
  }

  lastUrl = url;
  navigationGeneration += 1;
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  clearCurrentVacancy();
  processCurrentPage(0, navigationGeneration);
}

function observeNavigation() {
  window.addEventListener('popstate', handleNavigation);
  window.addEventListener('hashchange', handleNavigation);

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    window.dispatchEvent(new Event('hh-reply-ai-navigation'));
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event('hh-reply-ai-navigation'));
  };

  window.addEventListener('hh-reply-ai-navigation', handleNavigation);

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) handleNavigation();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    processCurrentPage();
    observeNavigation();
  }, { once: true });
} else {
  processCurrentPage();
  observeNavigation();
}
