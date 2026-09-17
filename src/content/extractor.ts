import { VacancyData } from '../types';
import { normalizeQuotesAndCurrency, stripHtml } from '../utils/formatter';

/**
 * Извлекает структурированные данные вакансии со страницы hh.ru
 * Использует многоуровневый поиск:
 * 1. JSON-LD (Schema.org JobPosting)
 * 2. Семантические селекторы hh.ru (data-qa, itemscope, bloko-классы)
 * 3. Fallback поиск по структуре заголовков и текстовых блоков
 */
export function extractVacancyFromDocument(doc: Document = document, currentUrl: string = window.location.href): VacancyData | null {
  // Проверяем, действительно ли мы на странице вакансии
  const vacancyIdMatch = currentUrl.match(/\/vacancy\/(\d+)/);
  let vacancyId: string | null = vacancyIdMatch ? vacancyIdMatch[1] : null;

  // Пытаемся извлечь JSON-LD
  const jsonLdData = extractFromJsonLd(doc);

  // 1. Заголовок вакансии
  let title = querySelectorText(doc, [
    '[data-qa="vacancy-title"]',
    'h1[data-qa="vacancy-title"]',
    'h1.bloko-header-section-1',
    'h1[itemprop="title"]',
    '.vacancy-title',
    'h1'
  ]);

  if (!title && jsonLdData?.title) {
    title = jsonLdData.title;
  }

  // Если заголовка нет вообще, значит это скорее всего не страница отдельной вакансии
  if (!title) {
    const pageTitle = doc.title;
    if (pageTitle && pageTitle.toLowerCase().includes('вакансия')) {
      title = pageTitle.split('—')[0]?.split('|')[0]?.trim() || pageTitle;
    }
  }

  if (!title) {
    return null;
  }

  // 2. Компания / работодатель
  let company = querySelectorText(doc, [
    '[data-qa="vacancy-company-name"]',
    '[data-qa="vacancy-company-name-inline"]',
    '[data-qa="vacancy-company"]',
    'a[itemprop="hiringOrganization"]',
    '.vacancy-company-name',
    '[data-qa="employer-title"]',
    '.vacancy-company-name-wrapper'
  ]);

  if (!company && jsonLdData?.company) {
    company = jsonLdData.company;
  }

  // 3. Зарплата
  let salary = querySelectorText(doc, [
    '[data-qa="vacancy-salary"]',
    '[data-qa="vacancy-salary-compensation-type-net"]',
    '[data-qa="vacancy-salary-compensation-type-gross"]',
    '.vacancy-salary',
    'span[data-qa="vacancy-salary-compensation-type-net"]',
    '[itemprop="baseSalary"]'
  ]);

  if (!salary && jsonLdData?.salary) {
    salary = jsonLdData.salary;
  }

  // 4. Локация / адрес
  let location = querySelectorText(doc, [
    '[data-qa="vacancy-view-raw-address"]',
    '[data-qa="vacancy-view-location"]',
    'span[itemprop="addressLocality"]',
    '[data-qa="vacancy-address"]',
    '.vacancy-address-text'
  ]);

  if (!location && jsonLdData?.location) {
    location = jsonLdData.location;
  }

  // 5. Тип занятости и график
  const employmentType = querySelectorText(doc, [
    '[data-qa="vacancy-view-employment-mode"]',
    'p[data-qa="vacancy-view-employment-mode"]',
    'span[itemprop="employmentType"]'
  ]);

  const schedule = querySelectorText(doc, [
    '[data-qa="vacancy-view-work-schedule"]',
    'span[itemprop="workHours"]'
  ]);

  // 6. Описание вакансии
  let description = '';
  const descElem = querySelectorFirst(doc, [
    '[data-qa="vacancy-description"]',
    '.g-user-content',
    '[itemprop="description"]',
    '.vacancy-description'
  ]);

  if (descElem) {
    description = stripHtml(descElem.innerHTML).trim();
  } else if (jsonLdData?.description) {
    description = stripHtml(jsonLdData.description).trim();
  }

  // 7. Ключевые навыки (теги)
  const skillElements = doc.querySelectorAll(
    '[data-qa="bloko-tag__text"], [data-qa="skills-element"], .bloko-tag__text, .bloko-tag_inline'
  );
  const skills: string[] = [];
  skillElements.forEach(el => {
    const text = el.textContent?.trim();
    if (text && !skills.includes(text)) {
      skills.push(text);
    }
  });

  // 8. Требования и обязанности (семантический разбор списков и заголовков)
  const { requirements, responsibilities } = extractListSections(doc, descElem);

  // Очистка и нормализация
  title = normalizeQuotesAndCurrency(title);
  if (company) company = normalizeQuotesAndCurrency(company);
  if (salary) salary = normalizeQuotesAndCurrency(salary);

  return {
    vacancyId,
    url: currentUrl,
    title,
    company: company || null,
    description: description || title,
    requirements,
    responsibilities,
    skills,
    salary: salary || null,
    employmentType: employmentType || null,
    schedule: schedule || null,
    location: location || null,
    extractedAt: new Date().toISOString()
  };
}

/**
 * Вспомогательный хелпер: поиск первого совпадения текста из массива селекторов
 */
function querySelectorText(root: Document | Element, selectors: string[]): string | null {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el && el.textContent) {
        const cleaned = el.textContent.trim();
        if (cleaned) return cleaned;
      }
    } catch {
      // Игнорируем невалидные селекторы
    }
  }
  return null;
}

/**
 * Вспомогательный хелпер: поиск первого DOM-элемента из массива селекторов
 */
function querySelectorFirst(root: Document, selectors: string[]): Element | null {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch {
      // Игнорируем невалидные селекторы
    }
  }
  return null;
}

/**
 * Извлечение данных из Schema.org JobPosting JSON-LD
 */
function extractFromJsonLd(doc: Document): {
  title?: string;
  company?: string;
  salary?: string;
  location?: string;
  description?: string;
} | null {
  try {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      const text = scripts[i].textContent;
      if (!text) continue;
      const parsed = JSON.parse(text);
      const item = Array.isArray(parsed) ? parsed.find(x => x['@type'] === 'JobPosting') : parsed;

      if (item && (item['@type'] === 'JobPosting' || item['title'])) {
        let salaryStr: string | undefined;
        if (item.baseSalary) {
          const val = item.baseSalary.value;
          const currency = item.baseSalary.currency === 'RUR' || item.baseSalary.currency === 'RUB' ? 'руб.' : item.baseSalary.currency;
          if (val) {
            if (typeof val === 'object') {
              const min = val.minValue || val.value;
              const max = val.maxValue;
              salaryStr = max ? `от ${min} до ${max} ${currency}` : `${min} ${currency}`;
            } else {
              salaryStr = `${val} ${currency}`;
            }
          }
        }

        return {
          title: item.title,
          company: item.hiringOrganization?.name,
          salary: salaryStr,
          location: item.jobLocation?.address?.addressLocality || item.jobLocation?.address?.streetAddress,
          description: item.description
        };
      }
    }
  } catch (e) {
    // Безопасный fallback
  }
  return null;
}

/**
 * Выделение требований и обязанностей из текстовых блоков и списков вакансии
 */
function extractListSections(doc: Document, descContainer: Element | null): { requirements: string[]; responsibilities: string[] } {
  const requirements: string[] = [];
  const responsibilities: string[] = [];

  const root = descContainer || doc.body;
  if (!root) return { requirements, responsibilities };

  const paragraphs = root.querySelectorAll('p, strong, b, div.bloko-header-section-2, div.bloko-header-section-3, h2, h3, h4');

  paragraphs.forEach(header => {
    const text = header.textContent?.toLowerCase().trim() || '';

    // Определяем категорию секции
    const isReq = text.includes('требован') || text.includes('ожидан') || text.includes('ждем') || text.includes('необходим') || text.includes('наш кандидат');
    const isResp = text.includes('обязанност') || text.includes('задач') || text.includes('предстоит') || text.includes('чем занимат');

    if (isReq || isResp) {
      // Ищем следующий список <ul> или <ol>
      let next = header.nextElementSibling;
      let depth = 0;
      while (next && depth < 4) {
        if (next.tagName === 'UL' || next.tagName === 'OL') {
          const items = next.querySelectorAll('li');
          items.forEach(li => {
            const liText = li.textContent?.trim();
            if (liText && liText.length > 5) {
              if (isReq && !requirements.includes(liText)) requirements.push(liText);
              if (isResp && !responsibilities.includes(liText)) responsibilities.push(liText);
            }
          });
          break;
        }
        next = next.nextElementSibling;
        depth++;
      }
    }
  });

  return { requirements, responsibilities };
}
