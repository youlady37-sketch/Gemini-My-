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

    if (textCorpus.includes('b2b') || textCorpus.includes('корпоративн') || textCorpus.includes('бизнес')) strongMatches.push(`B2B продажи: ${profile.b2bExperienceYears}+ лет опыта (общий стаж в продажах ${profile.salesExperienceYears} лет)`);
    else strongMatches.push(`Совокупный опыт в продажах ${profile.salesExperienceYears} лет (из них B2B ${profile.b2bExperienceYears}+ лет)`);

    if (textCorpus.includes('c-level') || textCorpus.includes('лпр') || textCorpus.includes('собственник') || textCorpus.includes('первыми лицами') || textCorpus.includes('топ-менедж') || textCorpus.includes('директор')) {
      strongMatches.push('Прямые переговоры с первыми лицами: собственники, HRD, C-level (в среднем 6–10 ЛПР в день)');
      recommendedAchievements.push('Работа с 6–10 лицами, принимающими решение, в день');
    }

    if (textCorpus.includes('saas') || textCorpus.includes('it') || textCorpus.includes('софт') || textCorpus.includes('облачн') || textCorpus.includes('цифров') || textCorpus.includes('программ')) {
      strongMatches.push('Фокус на IT и SaaS: опыт ведения комплексных технологических сделок и развития клиентов');
      if (textCorpus.includes('qsoft') || textCorpus.includes('интегратор') || textCorpus.includes('разработ')) recommendedAchievements.push('В QSoft результат более 10 млн руб. в течение 3 месяцев');
    }

    if (textCorpus.includes('цикл') || textCorpus.includes('сложн') || textCorpus.includes('long') || textCorpus.includes('длинн')) {
      strongMatches.push('Управление сложными сделками с длинным циклом и его оптимизация');
      recommendedAchievements.push('Сокращение цикла сделки с 9 месяцев до 2–5 месяцев');
    }

    if (textCorpus.includes('план') || textCorpus.includes('выручк') || textCorpus.includes('миллион') || textCorpus.includes('чек') || textCorpus.includes('масштаб') || textCorpus.includes('enterprise')) recommendedAchievements.push('Личный рекорд 11,5 млн руб. в месяц; регулярные сделки от 1 млн руб.');

    if (textCorpus.includes('avito') || textCorpus.includes('авито')) {
      strongMatches.push('Прямой опыт сотрудничества с Avito');
      recommendedAchievements.push('Опыт работы с Avito');
    } else if (textCorpus.includes('vk') || textCorpus.includes('вконтакте')) {
      strongMatches.push('Прямой опыт сотрудничества с VK');
      recommendedAchievements.push('Опыт работы с VK');
    } else if (textCorpus.includes('самолет') || textCorpus.includes('девелоп') || textCorpus.includes('недвижим')) {
      strongMatches.push('Опыт взаимодействия с девелоперами и крупным сектором');
      recommendedAchievements.push('Опыт работы с Самолет');
    } else if (textCorpus.includes('ритейл') || textCorpus.includes('вкусвилл') || textCorpus.includes('fmcg')) {
      strongMatches.push('Опыт ведения ритейл-сегмента');
      recommendedAchievements.push('Опыт работы с ВкусВилл');
    }

    if (textCorpus.includes('руковод') || textCorpus.includes('команд') || textCorpus.includes('наставнич') || textCorpus.includes('обучен') || textCorpus.includes('найм')) {
      partialMatches.push('Управленческий опыт: построение и обучение команды продаж с нуля');
      recommendedAchievements.push('RamaYoga: построение и обучение отдела продаж с нуля до 7 сотрудников');
    }

    if (textCorpus.includes('вебинар') || textCorpus.includes('презентац') || textCorpus.includes('выступлен')) {
      strongMatches.push('Проведение онлайн-мероприятий и презентаций для широкой B2B-аудитории');
      recommendedAchievements.push('Проведение вебинаров на 50–100 человек');
    }

    if (textCorpus.includes('ltv') || textCorpus.includes('пролонгац') || textCorpus.includes('удержан') || textCorpus.includes('поддержк') || textCorpus.includes('account')) {
      strongMatches.push('Развитие действующей базы: удержание клиентов и переход на длинные договоры');
      recommendedAchievements.push('Около 15% конверсия в годовую поддержку');
    }

    if (recommendedAchievements.length === 0) {
      recommendedAchievements.push('Личный рекорд 11,5 млн руб. в месяц (сделки от 1 млн руб.)');
      recommendedAchievements.push('Сокращение цикла сделки с 9 месяцев до 2–5 месяцев');
      recommendedAchievements.push('Ведение переговоров с C-level и 6–10 ЛПР в день');
    }

    const specificTerms = [
      { trigger: 'английск', label: 'Свободный английский язык (требует подтверждения)' },
      { trigger: '1с', label: 'Глубокое знание конфигураций 1С' },
      { trigger: 'тендер', label: 'Тендерные закупки (44-ФЗ / 223-ФЗ)' },
      { trigger: 'холодн', label: 'Массовый холодный поиск и телемаркетинг' },
      { trigger: 'sql', label: 'Навыки SQL или техническая аналитика данных' }
    ];
    for (const term of specificTerms) if (textCorpus.includes(term.trigger)) unknownRequirements.push(term.label);

    if (textCorpus.includes('ненормирован') || textCorpus.includes('переработ')) risks.push('В вакансии упоминается ненормированный график');
    if (!vacancy.salary) risks.push('Уровень дохода не указан в открытом доступе (обсуждается на интервью)');

    return {
      strongMatches: Array.from(new Set(strongMatches)),
      partialMatches: Array.from(new Set(partialMatches)),
      unknownRequirements: Array.from(new Set(unknownRequirements)),
      recommendedAchievements: Array.from(new Set(recommendedAchievements)).slice(0, 3),
      risks: Array.from(new Set(risks))
    };
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
    if (!textToRewrite) return this.generateCoverLetter(vacancy, profile, analysis, mode);

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

  private rewriteLocally(vacancy: VacancyData, profile: UserProfile, analysis: VacancyAnalysis, currentText: string, mode: RewriteMode): string {
    let body = currentText
      .replace(/@tattytoo[\s\S]*$/i, '')
      .replace(/\+79151000852[\s\S]*$/i, '')
      .trim();

    if (!body) return this.generateLocally(vacancy, profile, analysis, mode);

    switch (mode) {
      case 'shorter': {
        const paragraphs = body.split(/\n\s*\n/).filter(Boolean);
        const essential = paragraphs
          .map(p => p.replace(/^(Здравствуйте|Добрый день)[,.]?\s*/i, '').trim())
          .filter(p => p.length > 0 && !p.toLowerCase().includes('внимательно изучила') && !p.toLowerCase().includes('пишу по поводу'));
        body = `Здравствуйте.\n\n${essential.join('\n\n')}\n\nБуду рада обсудить задачи подробнее.`;
        break;
      }
      case 'livelier': {
        body = body.replace(/^(Здравствуйте|Добрый день)[,.]?\s*/i, '');
        body = `Добрый день!\n\n${body.trim()}`;
        if (!body.includes('Буду рада') && !body.includes('Готова') && !body.includes('подключусь')) body += `\n\nС удовольствием подключусь к диалогу и отвечу на любые вопросы.`;
        break;
      }
      case 'more_concrete': {
        if (!body.includes('Факты и цифры') && !body.includes('- ')) {
          body = body.replace(/(Из (ключевых|практических) результатов:?|В работе опираюсь на:?)/i, 'Факты и ключевые результаты:\n- ');
        }
        break;
      }
      case 'business_focused': {
        body = body.replace(/^(Привет|Добрый день|Здравствуйте)[,!]?\s*/i, '');
        body = `Здравствуйте.\n\n${body.trim()}`;
        break;
      }
      case 'anti_bureaucracy': {
        body = body
          .replace(/внимательно изучила задачи позиции:?/gi, 'посмотрела требования к позиции:')
          .replace(/в связи с вышеизложенным/gi, 'поэтому')
          .replace(/настоящим сообщаю/gi, '')
          .replace(/данная вакансия вызвала у меня интерес/gi, 'вакансия мне интересна')
          .replace(/осуществлять руководство/gi, 'руководить')
          .trim();
        break;
      }
      case 'default':
      default:
        break;
    }

    return ensureContactBlock(normalizeQuotesAndCurrency(body));
  }

  private generateLocally(vacancy: VacancyData, profile: UserProfile, analysis: VacancyAnalysis, mode: RewriteMode): string {
    const company = vacancy.company ? vacancy.company.trim() : 'вашу команду';
    const position = vacancy.title.trim();
    const achs = analysis.recommendedAchievements.length > 0 ? analysis.recommendedAchievements : ['личный рекорд 11,5 млн руб. в месяц при регулярных сделках от 1 млн руб.', 'сокращение цикла сделки с 9 месяцев до 2–5 месяцев'];
    const ach1 = achs[0] ? this.formatAchievement(achs[0]) : 'личный рекорд 11,5 млн руб. в месяц';
    const ach2 = achs[1] ? this.formatAchievement(achs[1]) : 'сокращение цикла B2B-сделки с 9 до 2–5 месяцев';
    let body = '';

    switch (mode) {
      case 'shorter': body = [`Здравствуйте.`, ``, `Меня заинтересовала позиция "${position}" в ${company}. В B2B-продажах я более 5 лет (общий опыт в коммерции — 8 лет), специализируюсь на сложных сделках и развитии ключевых клиентов.`, ``, `Из ключевых результатов: ${ach1}, а также ${ach2}. Привыкла работать напрямую с первыми лицами и собственниками, проводя по 6–10 переговоров с ЛПР в день.`, ``, `Буду рада обсудить задачи позиции и то, чем могу быть полезна вашему бизнесу.`].join('\n'); break;
      case 'livelier': body = [`Добрый день!`, ``, `Увидела вакансию "${position}" в ${company} — задачи прямо по моему профилю. Последние 8 лет я занимаюсь продажами, из которых более 5 лет в B2B и IT/SaaS.`, ``, `Мне близки длинные циклы и работа со сложными продуктами, где нужно не "продавливать", а выстраивать партнерство с собственниками и C-level. Например, удавалось сокращать цикл закрытия с 9 до 2–5 месяцев и выходить на личный результат 11,5 млн руб. в месяц (с чеками от 1 млн руб.).`, ``, `Хорошо понимаю механику работы с крупными заказчиками и конверсию в долгосрочные контракты. Готова подключиться к диалогу и ответить на любые вопросы.`].join('\n'); break;
      case 'more_concrete': body = [`Здравствуйте.`, ``, `Откликаюсь на вакансию "${position}" в ${company}. Мой профиль — управление ключевыми клиентами и B2B-продажи (8 лет опыта, 5+ лет в B2B-сегменте).`, ``, `Факты и цифры по опыту:`, `- ${ach1};`, `- ${ach2};`, `- Ежедневная работа с 6–10 ЛПР (собственники, HRD, C-level);`, `- Около 15% конверсия в годовую поддержку и пролонгацию.`, ``, `Готова предметно обсудить, как эти компетенции помогут решать текущие коммерческие планы ${company}.`].join('\n'); break;
      case 'business_focused': body = [`Здравствуйте.`, ``, `Обратила внимание на вакансию "${position}".`, ``, `Я 8 лет в продажах, более 5 лет веду enterprise и B2B-клиентов. Мой подход строится на выстраивании системных отношений с C-level: ${ach1}, а за счет плотной работы с возражениями удавалось сократить цикл сделки с 9 месяцев до 2–5 месяцев.`, ``, `Понимаю специфику работы с требовательными партнерами и умею доводить сложные переговоры до подписания договоров. Буду рада пообщаться о планах отдела.`].join('\n'); break;
      case 'anti_bureaucracy': body = [`Добрый день.`, ``, `Пишу по поводу вакансии "${position}" в ${company}.`, ``, `Я работаю в B2B-продажах уже 5 лет (общий стаж — 8 лет). Моя основная экспертиза — сложные продукты, длинный цикл и прямой контакт с лицами, принимающими решения.`, ``, `В работе опираюсь на понятные метрики: ${ach1}, ${ach2}. В день обычно провожу 6–10 переговоров с собственниками и топ-менеджерами, умею удерживать клиентов и переводить их на регулярные контракты.`, ``, `Предлагаю созвониться на 15 минут и обсудить детали позиции.`].join('\n'); break;
      case 'default':
      default: body = [`Здравствуйте.`, ``, `Меня заинтересовала вакансия "${position}" в ${company}. Более 5 лет я развиваю B2B-направление и ключевых клиентов (общий стаж в коммерции — 8 лет).`, ``, `Мой основной фокус — сложные продажи и длинные циклы сделок, где ключевую роль играют переговоры с первыми лицами: собственниками, HRD и C-level. Из практических результатов: ${ach1}, а также ${ach2}.`, ``, `Внимательно изучила задачи позиции: умею быстро вникать в специфику продукта заказчика, выстраивать диалог с ЛПР и доводить клиентов до закрытия сделки.`, ``, `Буду рада познакомиться лично и обсудить детали сотрудничества.`].join('\n'); break;
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
