import 'dotenv/config';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 8787);
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const allowedOrigin = process.env.CORS_ORIGIN || '*';

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY is not set. AI endpoints will return 503.');
}

app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const requests = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  if (current.count >= MAX_REQUESTS) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  current.count += 1;
  next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(geminiApiKey), model: geminiModel });
});

function compact(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function callGemini(prompt: string, json = false): Promise<string> {
  if (!geminiApiKey) throw new Error('GEMINI_API_KEY is not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: json
          ? { temperature: 0.2, responseMimeType: 'application/json' }
          : { temperature: 0.7 }
      })
    }
  );

  const data = await response.json() as any;
  if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed: ${response.status}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

const ANALYSIS_SCHEMA = `Return ONLY valid JSON with exactly these keys: strongMatches, partialMatches, unknownRequirements, recommendedAchievements, risks. Every value must be an array of strings.`;

app.post('/api/analyze', rateLimit, async (req, res) => {
  try {
    const { vacancy, profile } = req.body || {};
    if (!vacancy || !profile) return res.status(400).json({ error: 'vacancy and profile are required' });

    const prompt = `You are an expert Russian B2B sales recruiter. Analyze a vacancy against the candidate profile. Use ONLY facts present in the supplied vacancy and profile. Never invent experience, clients, technologies, languages, results, or responsibilities. Distinguish confirmed matches from unknown requirements. Select at most 3 recommended achievements that are genuinely relevant to this vacancy. Keep answers concise and in Russian.\n\n${ANALYSIS_SCHEMA}\n\nVACANCY:\n${compact(vacancy)}\n\nCANDIDATE PROFILE:\n${compact(profile)}`;
    const result = parseJson<any>(await callGemini(prompt, true));
    const normalized = {
      strongMatches: Array.isArray(result.strongMatches) ? result.strongMatches.slice(0, 8) : [],
      partialMatches: Array.isArray(result.partialMatches) ? result.partialMatches.slice(0, 8) : [],
      unknownRequirements: Array.isArray(result.unknownRequirements) ? result.unknownRequirements.slice(0, 8) : [],
      recommendedAchievements: Array.isArray(result.recommendedAchievements) ? result.recommendedAchievements.slice(0, 3) : [],
      risks: Array.isArray(result.risks) ? result.risks.slice(0, 8) : []
    };
    res.json(normalized);
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'AI analysis failed' });
  }
});

app.post('/api/generate-cover-letter', rateLimit, async (req, res) => {
  try {
    const { vacancy, profile, analysis, mode = 'default' } = req.body || {};
    if (!vacancy || !profile || !analysis) return res.status(400).json({ error: 'vacancy, profile and analysis are required' });

    const prompt = `Write a short natural Russian cover letter for this vacancy. The candidate is applying personally. Do not write a resume summary. Connect 2-3 relevant confirmed facts from the profile to the employer's needs. Explicitly show what the candidate can contribute to this business. Never invent facts. Do not mention information absent from the profile. Avoid bureaucratic phrases, generic AI clichés, exaggerated enthusiasm and empty claims. Use only straight double quotes and write currency as руб. Do not add contact details; the client will append them. Mode: ${String(mode)}.\n\nVACANCY:\n${compact(vacancy)}\n\nCANDIDATE PROFILE:\n${compact(profile)}\n\nANALYSIS:\n${compact(analysis)}`;
    const text = await callGemini(prompt);
    res.json({ text });
  } catch (error) {
    console.error('Cover letter error:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Cover letter generation failed' });
  }
});

app.post('/api/rewrite-cover-letter', rateLimit, async (req, res) => {
  try {
    const { vacancy, profile, analysis, text, mode = 'default' } = req.body || {};
    if (!vacancy || !profile || !text) return res.status(400).json({ error: 'vacancy, profile and text are required' });

    const prompt = `Rewrite the supplied Russian cover letter for the same vacancy. Preserve every factual claim: do not add new achievements, companies, technologies, skills or numbers. Keep it short and natural. Mode: ${String(mode)}.\n\nVACANCY:\n${compact(vacancy)}\n\nPROFILE:\n${compact(profile)}\n\nANALYSIS:\n${compact(analysis || {})}\n\nCURRENT LETTER:\n${text}`;
    const rewritten = await callGemini(prompt);
    res.json({ text: rewritten });
  } catch (error) {
    console.error('Rewrite error:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Cover letter rewrite failed' });
  }
});

app.listen(port, () => console.log(`HH Reply AI backend listening on port ${port}`));
