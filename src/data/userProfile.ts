import { UserProfile } from '../types';

export const defaultUserProfile: UserProfile = {
  name: "Татьяна Павлович",
  targetPosition: "Key Account Manager",
  salesExperienceYears: 8,
  b2bExperienceYears: 5,
  specializations: [
    "B2B sales",
    "IT",
    "SaaS",
    "complex sales",
    "long sales cycle",
    "работа с собственниками",
    "HRD",
    "C-level",
    "развитие клиентов",
    "переговоры",
    "account management"
  ],
  keyAchievements: [
    "личный рекорд 11,5 млн руб. в месяц",
    "сделки от 1 млн руб.",
    "опыт работы с Avito",
    "опыт работы с VK",
    "опыт работы с Самолет",
    "опыт работы с ВкусВилл",
    "в QSoft был результат более 10 млн руб. в течение 3 месяцев",
    "сокращение цикла сделки с 9 месяцев до 2–5 месяцев",
    "проведение вебинаров на 50–100 человек",
    "RamaYoga: построение и обучение отдела продаж с нуля до 7 сотрудников",
    "ЦЗК: средний чек около 120 000 руб.",
    "работа с 6–10 лицами, принимающими решение, в день",
    "работа с клиентами из SRO/NOSTROY",
    "около 15% конверсия в годовую поддержку"
  ],
  contacts: {
    telegramHandle: "@tattytoo",
    phone: "+79151000852",
    displayName: "Татьяна",
    telegramUrl: "https://t.me/tattytoo"
  }
};

export const CONTACT_BLOCK = `@tattytoo
+79151000852
Татьяна
https://t.me/tattytoo`;
