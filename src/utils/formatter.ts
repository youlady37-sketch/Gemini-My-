import { CONTACT_BLOCK } from '../data/userProfile';

/**
 * Нормализует текст под требования стиля:
 * - Только стандартные двойные кавычки " " (никаких « », “ ”, „ ”)
 * - Символ рубля ₽ заменяется на "руб." или "р."
 */
export function normalizeQuotesAndCurrency(text: string): string {
  if (!text) return '';
  return text
    // Замена типографских кавычек на обычные двойные кавычки
    .replace(/[«»“”„‟]/g, '"')
    // Замена знака рубля на "руб."
    .replace(/₽/g, ' руб.')
    // Очистка возможных задвоенных пробелов
    .replace(/ {2,}/g, ' ');
}

/**
 * Гарантирует наличие контактного блока в конце сопроводительного письма
 */
export function ensureContactBlock(text: string): string {
  const normalized = normalizeQuotesAndCurrency(text.trim());
  const cleanContacts = CONTACT_BLOCK.trim();

  // Проверяем, есть ли уже контактные данные
  if (normalized.includes('@tattytoo') || normalized.includes('+79151000852')) {
    return normalized;
  }

  return `${normalized}\n\n${cleanContacts}`;
}

/**
 * Безопасное копирование текста в буфер обмена
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback для нестандартных окружений
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('Ошибка при копировании в буфер:', err);
    return false;
  }
}

/**
 * Очищает HTML теги и спецсимволы
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
