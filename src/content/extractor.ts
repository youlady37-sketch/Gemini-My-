import { VacancyData } from '../types';
import { normalizeQuotesAndCurrency, stripHtml } from '../utils/formatter';

/**
 * Извлекает структурированные данные вакансии со страницы hh.ru.
 * Приоритет: DOM-селекторы HH.ru -> Schema.org JSON-LD -> fallback.
 */
export function extractVacancyFromDocument(doc: Document = document, currentUrl: string = window.location.href): VacancyData | null {
  const vacancyIdMatch = currentUrl.match(/\/vacancy\/(\d+)/);
  const vacancyId: string | null = vacancyIdMatch ? vacancyIdMatch[1] : null;
  const jsonLdData = extractFromJsonLd(doc);

  let title = querySelectorText(doc, [
    '[data-qa="vacancy-title"]',
    'h1[data-qa="vacancy-title"]',
    'h1.bloko-header-section-1',
    'h1[itemprop="title"]',
    '.vacancy-title',
    'h1'
  ]) || jsonLdData?.title || null;

  if (!title) {
    const pageTitle = doc.title;
    if (pageTitle && pageTitle.toLowerCase().includes('вакансия')) {
      title = pageTitle.split('—')[0]?.split('|')[0]?.trim() || pageTitle;
    }
  }
  if (!title) return null;

  let company = querySelectorText(doc, [
    '[data-qa="vacancy-company-name"]',
    '[data-qa="vacancy-company-name-inline"]',
    '[data-qa="vacancy-company"]',
    'a[itemprop="hiringOrganization"]',
    '.vacancy-company-name',
    '[data-qa="employer-title"]',
    '.vacancy-company-name-wrapper'
  ]) || jsonLdData?.company || null;

  let salary = querySelectorText(doc, [
    '[data-qa="vacancy-salary"]',
    '[data-qa="vacancy-salary-compensation-type-net"]',
    '[data-qa="vacancy-salary-compensation-type-gross"]',
    '.vacancy-salary',
    'span[data-qa="vacancy-salary-compensation-type-net"]',
    '[itemprop="baseSalary"]'
  ]) || jsonLdData?.salary || null;

  const location = querySelectorText(doc, [
    '[data-qa="vacancy-view-raw-address"]',
    '[data-qa="vacancy-view-location"]',
    'span[itemprop="addressLocality"]',
    '[data-qa="vacancy-address"]',
    '.vacancy-address-text'
  ]) || jsonLdData?.location || null;

  const employmentType = querySelectorText(doc, [
    '[data-qa="vacancy-view-employment-mode"]',
    'p[data-qa="vacancy-view-employment-mode"]',
    'span[itemprop="employmentType"]'
  ]);

  const schedule = querySelectorText(doc, [
    '[data-qa="vacancy-view-work-schedule"]',
    'span[itemprop="workHours"]'
  ]);

  let description = '';
  const descElem = querySelectorFirst(doc, [
    '[data-qa="vacancy-description"]',
    '.g-user-content',
    '[itemprop="description"]',
    '.vacancy-description'
  ]);
  if (descElem) description = stripHtml(descElem.innerHTML).trim();
  else if (jsonLdData?.description) description = stripHtml(jsonLdData.description).trim();

  const skills: string[] = [];
  doc.querySelectorAll('[data-qa="bloko-tag__text"], [data-qa="skills-element"], .bloko-tag__text, .bloko-tag_inline')
    .forEach(el => {
      const text = el.textContent?.trim();
      if (text && !skills.includes(text)) skills.push(text);
    });

  const { requirements, responsibilities } = extractListSections(doc, descElem);

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

function querySelectorText(root: Document | Element, selectors: string[]): string | null {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      const cleaned = el?.textContent?.trim();
      if (cleaned) return cleaned;
    } catch {
      // Ignore invalid selectors so one broken fallback cannot stop extraction.
    }
  }
  return null;
}

function querySelectorFirst(root: Document, selectors: string[]): Element | null {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch {
      // Ignore invalid selectors.
    }
  }
  return null;
}

function extractFromJsonLd(doc: Document): {
  title?: string;
  company?: string;
  salary?: string;
  location?: string;
  description?: string;
} | null {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

  for (const script of Array.from(scripts)) {
    try {
      const parsed = JSON.parse(script.textContent || '');
      const candidates = flattenJsonLd(parsed);
      const item = candidates.find(value => {
        const type = value?.['@type'];
        return type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'));
      });
      if (!item) continue;

      let salaryStr: string | undefined;
      const baseSalary = item.baseSalary;
      if (baseSalary) {
        const currencyCode = baseSalary.currency;
        const currency = currencyCode === 'RUR' || currencyCode === 'RUB' ? 'руб.' : currencyCode;
        const value = baseSalary.value;
        if (value && typeof value === 'object') {
          const min = value.minValue ?? value.value;
          const max = value.maxValue;
          if (min != null) salaryStr = max != null ? `от ${min} до ${max} ${currency}` : `${min} ${currency}`;
        } else if (value != null) {
          salaryStr = `${value} ${currency}`;
        }
      }

      const locationObject = Array.isArray(item.jobLocation) ? item.jobLocation[0] : item.jobLocation;
      const address = locationObject?.address;
      const location = typeof address === 'string'
        ? address
        : address?.addressLocality || address?.streetAddress;

      return {
        title: item.title,
        company: typeof item.hiringOrganization === 'string'
          ? item.hiringOrganization
          : item.hiringOrganization?.name,
        salary: salaryStr,
        location,
        description: item.description
      };
    } catch {
      // One malformed JSON-LD block must not prevent other extraction paths.
    }
  }
  return null;
}

function flattenJsonLd(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== 'object') return [];
  const result = [value];
  if (Array.isArray(value['@graph'])) result.push(...value['@graph'].flatMap(flattenJsonLd));
  return result;
}

function extractListSections(doc: Document, descContainer: Element | null): { requirements: string[]; responsibilities: string[] } {
  const requirements: string[] = [];
  const responsibilities: string[] = [];
  const root = descContainer || doc.body;
  if (!root) return { requirements, responsibilities };

  const headers = root.querySelectorAll('p, strong, b, div.bloko-header-section-2, div.bloko-header-section-3, h2, h3, h4');
  headers.forEach(header => {
    const text = header.textContent?.toLowerCase().trim() || '';
    const isReq = /требован|ожидан|ждем|необходим|наш кандидат/.test(text);
    const isResp = /обязанност|задач|предстоит|чем занимат/.test(text);
    if (!isReq && !isResp) return;

    let next = header.nextElementSibling;
    let depth = 0;
    while (next && depth < 4) {
      if (next.tagName === 'UL' || next.tagName === 'OL') {
        next.querySelectorAll('li').forEach(li => {
          const liText = li.textContent?.trim();
          if (!liText || liText.length <= 5) return;
          if (isReq && !requirements.includes(liText)) requirements.push(liText);
          if (isResp && !responsibilities.includes(liText)) responsibilities.push(liText);
        });
        break;
      }
      next = next.nextElementSibling;
      depth++;
    }
  });

  return { requirements, responsibilities };
}
