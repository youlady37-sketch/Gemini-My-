import { ExtensionMessage } from '../types';

// Настройка открытия Side Panel по клику на иконку расширения
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to set side panel behavior:', error));
}

// Слушатель установки или обновления расширения
chrome.runtime.onInstalled.addListener(() => {
  console.log('HH Reply AI extension installed successfully.');
});

// Слушатель сообщений между content script и side panel
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDE_PANEL') {
    if (sender.tab?.id && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch((err) => {
        console.warn('Could not open side panel programmatically:', err);
      });
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (message.type === 'VACANCY_DETECTED') {
    if (message.payload) {
      chrome.storage.local.set({ hh_reply_ai_current_vacancy: message.payload });
    }
    sendResponse({ status: 'received' });
    return true;
  }
});

// Отслеживаем обновление вкладок для оповещения Side Panel при переходах по вакансиям
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const isVacancy = tab.url && (tab.url.includes('hh.ru/vacancy/') || tab.url.includes('/vacancy/'));
    if (isVacancy) {
      chrome.tabs.sendMessage(tabId, { type: 'REQUEST_VACANCY_EXTRACT' }, (res) => {
        if (!chrome.runtime.lastError && res) {
          chrome.storage.local.set({ hh_reply_ai_current_vacancy: res });
        }
      });
    } else if (tab.active) {
      chrome.storage.local.remove('hh_reply_ai_current_vacancy').catch(() => undefined);
    }
  }
});

// Отслеживаем переключение активной вкладки
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const isVacancy = tab.url && (tab.url.includes('hh.ru/vacancy/') || tab.url.includes('/vacancy/'));
    if (!isVacancy) {
      chrome.storage.local.remove('hh_reply_ai_current_vacancy').catch(() => undefined);
      chrome.runtime.sendMessage({ type: 'VACANCY_CLEARED' } as ExtensionMessage).catch(() => undefined);
    } else {
      chrome.tabs.sendMessage(tab.id!, { type: 'REQUEST_VACANCY_EXTRACT' }, (res) => {
        if (!chrome.runtime.lastError && res) {
          chrome.storage.local.set({ hh_reply_ai_current_vacancy: res });
          chrome.runtime.sendMessage({ type: 'VACANCY_DETECTED', payload: res } as ExtensionMessage).catch(() => undefined);
        }
      });
    }
  } catch {
    // Ignore tab errors
  }
});
