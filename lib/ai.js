// AI summaries. Two providers are supported, and both use the same
// "chat completions" request format:
//   - Google Gemini (free tier), used when GEMINI_API_KEY is set
//   - OpenRouter (many models, pay per use), used otherwise
// The model can be changed with GEMINI_MODEL / OPENROUTER_MODEL.

const PROVIDERS = {
  gemini: {
    name: 'Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    keyVar: 'GEMINI_API_KEY',
    modelVar: 'GEMINI_MODEL',
    defaultModel: 'gemini-3.5-flash-lite',
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyVar: 'OPENROUTER_API_KEY',
    modelVar: 'OPENROUTER_MODEL',
    defaultModel: 'anthropic/claude-haiku-5.5',
  },
};

const TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = [
  'You write the short summaries shown on the front page of a personal blog about film, AI and art.',
  'Summarize the blog post you are given in exactly two sentences of plain English, at most 45 words in total.',
  'Say what the post is about and its main idea, in the present tense.',
  'Use a neutral voice and start directly with the subject: never write "I", "the author", "this post", "the text" or "the post".',
  'Only use facts that are in the post.',
  'Reply with the two sentences only: no title, no quotation marks, no list.',
].join(' ');

// Which provider and model are in use, e.g. { name: 'Gemini', model: 'gemini-3.5-flash-lite' }
export function aiSettings() {
  const provider = process.env.GEMINI_API_KEY ? PROVIDERS.gemini : PROVIDERS.openrouter;
  return {
    ...provider,
    apiKey: process.env[provider.keyVar],
    model: process.env[provider.modelVar] || provider.defaultModel,
  };
}

// One line, no wrapping quotation marks, a sensible length
function cleanSummary(text) {
  const summary = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["“”]+|["“”]+$/g, '')
    .trim();
  if (summary.length < 20) throw new Error('The summary came back empty or too short');
  return summary.length > 400 ? `${summary.slice(0, 399).trimEnd()}…` : summary;
}

// Returns a two-sentence summary of the text. Throws if there's no API key,
// if the provider answers with an error, or if it takes longer than 8 seconds.
export async function summarize(text) {
  const { name, url, keyVar, apiKey, model } = aiSettings();
  if (!apiKey) throw new Error(`No AI key: set GEMINI_API_KEY or ${keyVar}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 160,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text.slice(0, 12000) },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = data.error?.message || data[0]?.error?.message || 'no details';
    throw new Error(`${name} answered ${response.status}: ${details}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error(`${name} sent no summary text`);
  return cleanSummary(content);
}

// For places where a missing summary is fine: returns null instead of throwing
export async function trySummarize(text) {
  try {
    return await summarize(text);
  } catch (error) {
    console.warn('AI summary skipped:', error.message);
    return null;
  }
}
