// AI summaries through OpenRouter (https://openrouter.ai): one API for many
// AI models. The model is chosen with the OPENROUTER_MODEL env var.

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_MODEL = 'anthropic/claude-haiku-5.5';
const TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = [
  'You write the short summaries shown on the front page of a personal blog about film, AI and art.',
  'Summarize the blog post you are given in exactly two sentences of plain English, at most 45 words in total.',
  'Say what the post is about and its main idea, in the present tense.',
  'Use a neutral voice: do not write "I", "the author" or "this post".',
  'Only use facts that are in the post.',
  'Reply with the two sentences only: no title, no quotation marks, no list.',
].join(' ');

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
// if OpenRouter answers with an error, or if it takes longer than 8 seconds.
export async function summarize(text) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Dailies blog', // the app name in OpenRouter's usage overview
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
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
    throw new Error(`OpenRouter answered ${response.status}: ${data.error?.message || 'no details'}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('OpenRouter sent no summary text');
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
