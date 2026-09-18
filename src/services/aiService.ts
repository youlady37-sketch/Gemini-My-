import { VacancyData, VacancyAnalysis, UserProfile, RewriteMode } from '../types';
import { normalizeQuotesAndCurrency, ensureContactBlock } from '../utils/formatter';

export interface AIServiceConfig {
  apiUrl?: string;
  provider?: 'mock' | 'server_proxy' | 'gemini';
}

class AIService {
  private config: AIServiceConfig = {
    apiUrl: (import.meta.env.VITE_AI_API_URL || '').trim(),
    provider: import.meta.env.VITE_AI_PROVIDER === 'server_proxy' ? 'server_proxy' : 'mock'
  };

  setConfig(config: Partial<AIServiceConfig>) {
    this.config = { ...this.config, ...config };
  }

  private ensureProxyConfigured(): string {
    const url = (this.config.apiUrl || '').trim().replace(/\/+$/, '');
    if (!url) {
      throw new Error('Не настроен VITE_AI_API_URL для режима server_proxy. Укажите адрес AI-бэкенда в конфигурации.');
    }
    return url;
  }

  async analyzeVacancy(vacancy: VacancyData, profile: UserProfile): Promise<VacancyAnalysis> {
    if (this.config.provider === 'server_proxy') {
      const baseUrl = this.ensureProxyConfigured();
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vacancy, profile })
        });
      } catch (err) {
        throw new Error(`AI-сервер недоступен: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!response.ok) {
        let msg = `Ошибка AI-сервера (${response.status})`;
        try {
          const data = await response.json();
          if (data?.error) msg = data.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      return await response.json();
    }
    return this.analyzeLocally(vacancy, profile);
  }

  private analyzeLocally(vacancy: VacancyData, profile: UserProfile): VacancyAnalysis {
    const textCorpus = [vacancy.title, vacancy.company || '', vacancy.description, ...vacancy.responsibilities, ...vacancy.requirements, ...vacancy.skills].join(' ').toLowerCase();
    const strongMatches: string[] = [];
    const partialMatches: string[] = [];
    const unknownRequirements: string[] = [];
    const recommendedAchievements: string[] = [];
    const risks: string[] = [];
    const add = (arr: string[], value: string) => { if (!arr.includes(value)) arr.push(value); };
    const has = (...terms: string[]) => terms.some(term => textCorpus.includes(term));

    const warmSales = has('входящ', 'тепл', 'лид', 'обращен', 'заявк');
    const needs = has('потребност', 'консульт', 'подбор решен', 'выявлен');
    const crm = has('crm', 'amo', 'битрикс', 'воронк', 'этапы сделки');
    const education = has('образован', 'школ', 'курс', 'обучен', 'студент', 'образовательн');
    const clientDevelopment = has('действующ', 'текущ', 'ключев', 'account', 'аккаунт', 'удержан', 'пролонгац', 'развитие клиентов');
    const coldSales = has('холодн', 'холодный поиск', 'телефонн', 'телемаркет');
    const plan = has('план продаж', 'плану продаж', 'kpi', 'выручк', 'оборот', 'конверси');
    const leadership = has('руковод', 'команд', 'наставнич', 'обучать менеджеров');
    const complexSales = has('b2b', 'корпоративн', 'сложн', 'длинн', 'enterprise', 'крупн', 'переговор');
    const it = has('it', 'saas', 'программ', 'цифров', 'сервис', 'технолог');

    if (warmSales) { add(strongMatches, 'Опыт работы с входящими и теплыми клиентами: выявление потребности и доведение до сделки'); add(recommendedAchievements, 'работа с входящими и теплыми клиентами'); }
    if (needs) { add(strongMatches, 'Выявление потребностей и подбор решения под задачу клиента'); add(recommendedAchievements, 'выявление потребностей и подбор решения под задачу клиента'); }
    if (crm) { add(strongMatches, 'Ведение сделок в CRM и контроль этапов воронки до закрытия'); add(recommendedAchievements, 'ведение сделок в CRM и контроль этапов до закрытия'); }
    if (education) add(strongMatches, 'Опыт консультативных продаж: понять задачу клиента, подобрать решение и довести до результата');
    if (clientDevelopment) { add(strongMatches, 'Развитие действующих клиентов и работа на долгосрочные отношения'); add(recommendedAchievements, 'около 15% конверсия в годовую поддержку'); }
    if (coldSales) { add(strongMatches, 'Опыт активных B2B-продаж и переговоров с лицами, принимающими решения'); add(recommendedAchievements, 'работа с 6–10 лицами, принимающими решение, в день'); }
    if (plan) { add(strongMatches, 'Ориентация на измеримый результат: личный план, выручка, конверсия и средний чек'); add(recommendedAchievements, 'личный рекорд 11,5 млн руб. в месяц'); }
    if (leadership) { add(partialMatches, 'Управленческий опыт: построение и обучение отдела продаж с нуля до 7 сотрудников'); add(recommendedAchievements, 'RamaYoga: построение и обучение отдела продаж с нуля до 7 сотрудников'); }
    if (complexSales) { add(strongMatches, '5+ лет B2B-продаж, переговоры со сложными заказчиками и управление сделками'); if (has('цикл', 'длинн')) add(recommendedAchievements, 'сокращение цикла сделки с 9 месяцев до 2–5 месяцев'); }
    if (it) add(strongMatches, 'Опыт продаж IT/SaaS и сложных продуктов');

    if (recommendedAchievements.length === 0) {
      add(recommendedAchievements, 'личный рекорд 11,5 млн руб. в месяц');
      add(recommendedAchievements, 'сокращение цикла сделки с 9 месяцев до 2–5 месяцев');
      add(recommendedAchievements, 'работа с 6–10 лицами, принимающими решение, в день');
    }

    const specificTerms = [
      { trigger: 'английск', label: 'Свободный английский язык (требует подтверждения)' },
      { trigger: '1с', label: 'Глубокое знание конфигураций 1С' },
      { trigger: 'тендер', label: 'Тендерные закупки (44-ФЗ / 223-ФЗ)' },
      { trigger: 'sql', label: 'Навыки SQL или техническая аналитика данных' }
    ];
    for (const term of specificTerms) if (textCorpus.includes(term.trigger)) add(unknownRequirements, term.label);
    if (!profile.b2bExperienceYears) add(partialMatches, 'Опыт B2B-продаж не указан в профиле');
    if (textCorpus.includes('ненормирован') || textCorpus.includes('переработ')) add(risks, 'В вакансии упоминается ненормированный график');
    if (!vacancy.salary) add(risks, 'Уровень дохода не указан в открытом доступе (обсуждается на интервью)');

    return { strongMatches: strongMatches.slice(0, 8), partialMatches: partialMatches.slice(0, 8), unknownRequirements: unknownRequirements.slice(0, 8), recommendedAchievements: Array.from(new Set(recommendedAchievements)).slice(0, 3), risks: risks.slice(0, 8) };
  }

  async generateCoverLetter(vacancy: VacancyData, profile: UserProfile, analysis: VacancyAnalysis, mode: RewriteMode = 'default'): Promise<string> {
    if (this.config.provider === 'server_proxy') {
      const baseUrl = this.ensureProxyConfigured();
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/generate-cover-letter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vacancy, profile, analysis, mode })
        });
      } catch (err) {
        throw new Error(`AI-сервер недоступен: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!response.ok) {
        let msg = `Ошибка AI-сервера (${response.status})`;
        try {
          const data = await response.json();
          if (data?.error) msg = data.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const res = await response.json();
      return ensureContactBlock(normalizeQuotesAndCurrency(res.text || ''));
    }
    return this.generateLocally(vacancy, profile, analysis, mode);
  }

  async rewriteCoverLetter(
    vacancy: VacancyData,
    profile: UserProfile,
    analysis: VacancyAnalysis,
    currentText: string,
    mode: RewriteMode = 'default'
  ): Promise<string> {
    const textToRewrite = (currentText || '').trim();
    if (!textToRewrite) {
      throw new Error('Нечего переписывать: текущий текст письма пуст. Сначала создайте письмо или верните текст.');
    }

    if (this.config.provider === 'server_proxy') {
      const baseUrl = this.ensureProxyConfigured();
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/rewrite-cover-letter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vacancy, profile, analysis, text: textToRewrite, mode })
        });
      } catch (err) {
        throw new Error(`AI-сервер недоступен: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!response.ok) {
        let msg = `Ошибка AI-сервера (${response.status})`;
        try {
          const data = await response.json();
          if (data?.error) msg = data.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const res = await response.json();
      return ensureContactBlock(normalizeQuotesAndCurrency(res.text || ''));
    }

    return this.rewriteLocally(vacancy, profile, analysis, textToRewrite, mode);
  }

  private rewriteLocally(vacancy: VacancyData, profile: UserProfile, analysis: VacancyAnalysis, _currentText: string, mode: RewriteMode): string {
    // In local mode Rewrite regenerates the letter from vacancy + profile so it can
    // fix relevance instead of merely shuffling the same generic text.
    return this.generateLocally(vacancy, profile, analysis, mode);
  }

  private generateLocally(vacancy: VacancyData, profile: UserProfile, analysis: VacancyAnalysis, mode: RewriteMode): string {
    const company = vacancy.company?.trim() || 'вашу команду';
    const position = vacancy.title.trim();
    const corpus = [vacancy.title, vacancy.description, ...vacancy.requirements, ...vacancy.responsibilities, ...vacancy.skills].join(' ').toLowerCase();
    const has = (...terms: string[]) => terms.some(term => corpus.includes(term));
    const warm = has('входящ', 'тепл', 'лид', 'обращен', 'заявк');
    const needs = has('потребност', 'консульт', 'подбор', 'выявлен');
    const crm = has('crm', 'amo', 'битрикс', 'воронк');
    const education = has('образован', 'школ', 'курс', 'обучен', 'студент');
    const account = has('действующ', 'ключев', 'account', 'аккаунт', 'удержан', 'пролонгац', 'развити');
    const cold = has('холодн', 'телемаркет', 'поиск клиентов');
    const leadership = has('руковод', 'команд', 'наставнич');
    const it = has('it', 'saas', 'программ', 'цифров', 'технолог');
    const longCycle = has('длинн', 'цикл сделки', 'сложн', 'enterprise');

    const selected = analysis.recommendedAchievements.filter(Boolean).slice(0, 3);
    const factText = selected.join('; ');
    let valueParagraph = '';
    if (warm || needs || crm || education) {
      const parts: string[] = [];
      if (warm) parts.push('работой с входящими и теплыми клиентами');
      if (needs) parts.push('выявлением потребностей и подбором решения');
      if (crm) parts.push('ведением сделки в CRM до закрытия');
      valueParagraph = 'Мне близок такой формат продаж: ' + parts.join(', ') + '. Здесь могу быть полезна тем, что умею быстро понять задачу клиента, провести его по воронке и довести диалог до сделки.';
    } else if (account) {
      valueParagraph = 'Могу быть полезна в развитии действующих клиентов: выстраивать отношения с ключевыми контактами, находить точки роста и доводить договоренности до конкретного коммерческого результата.';
    } else if (cold) {
      valueParagraph = 'Сильная сторона — активные продажи: поиск возможностей, переговоры с ЛПР, работа с возражениями и доведение сделки до результата.';
    } else if (leadership) {
      valueParagraph = 'Если в роли важна не только личная продажа, но и развитие команды, у меня есть практический опыт построения и обучения отдела продаж с нуля.';
    } else if (it || longCycle) {
      valueParagraph = 'Мой профиль хорошо подходит для сложных продаж: умею разбираться в продукте, вести переговоры с несколькими участниками и удерживать сделку до закрытия.';
    } else {
      valueParagraph = 'Могу быстро погрузиться в продукт, понять ожидания клиентов и связать их с коммерческим результатом.';
    }

    const results = factText ? 'Из релевантных результатов — ' + factText + '.' : 'За 8 лет в продажах я накопила практику работы с клиентами, переговорами и закрытием сделок.';
    let body: string;
    if (mode === 'shorter') {
      body = ['Здравствуйте.', '', 'Заинтересовала позиция "' + position + '" в ' + company + '.', valueParagraph, results].join('\n\n');
    } else if (mode === 'livelier') {
      body = ['Добрый день!', '', 'Увидела вакансию "' + position + '" в ' + company + ' — по задачам она мне близка.', valueParagraph, results, 'Буду рада обсудить, как мой опыт может пригодиться вашей команде.'].join('\n\n');
    } else if (mode === 'more_concrete') {
      body = ['Здравствуйте.', '', 'Откликаюсь на позицию "' + position + '" в ' + company + '.', valueParagraph, 'По цифрам: ' + results.replace(/^Из релевантных результатов — /, '')].join('\n\n');
    } else if (mode === 'business_focused') {
      body = ['Здравствуйте.', '', 'Откликаюсь на позицию "' + position + '" в ' + company + '.', valueParagraph, results, 'Могу сфокусироваться на ключевых коммерческих задачах роли: конверсия, выручка, развитие клиентов и доведение сделок до результата.'].join('\n\n');
    } else if (mode === 'anti_bureaucracy') {
      body = ['Добрый день!', '', 'Откликаюсь на "' + position + '" в ' + company + '.', valueParagraph, results, 'Буду рада коротко обсудить задачи и формат работы.'].join('\n\n');
    } else {
      body = ['Здравствуйте.', '', 'Меня заинтересовала вакансия "' + position + '" в ' + company + '.', valueParagraph, results, 'Думаю, мой опыт будет полезен в задачах этой позиции: могу быстро погружаться в продукт, понимать клиента и доводить продажи до результата.'].join('\n\n');
    }
    return ensureContactBlock(normalizeQuotesAndCurrency(body));
  }

  private formatAchievement(ach: string): string {
    const text = ach.trim();
    if (text.startsWith('RamaYoga') || text.startsWith('ЦЗК') || text.startsWith('QSoft') || text.startsWith('Avito') || text.startsWith('VK')) return text;
    return text.charAt(0).toLowerCase() + text.slice(1);
  }
}

export const aiService = new AIService();
