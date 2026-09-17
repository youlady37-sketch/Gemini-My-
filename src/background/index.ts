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
    // Сохраняем в storage
    if (message.payload) {
      chrome.storage.local.set({ hh_reply_ai_current_vacancy: message.payload });
    }
    sendResponse({ status: 'received' });
    return true;
  }
});

// Отслеживаем обновление вкладок для оповещения Side Panel при переходах по вакансиям
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.includes('hh.ru/vacancy/') || tab.url.includes('/vacancy/'))) {
    chrome.tabs.sendMessage(tabId, { type: 'REQUEST_VACANCY_EXTRACT' }, (res) => {
      if (!chrome.runtime.lastError && res) {
        chrome.storage.local.set({ hh_reply_ai_current_vacancy: res });
      }
    });
  }
});
