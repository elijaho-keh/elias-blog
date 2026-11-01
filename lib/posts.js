// Database queries and checks for posts, shared by the functions in /api.
import { query } from './db.js';

export const CATEGORIES = ['Film', 'AI', 'Art'];

// The columns the pages need. Listing them, instead of SELECT *, keeps
// internal columns like author_id out of the API.
const POST_COLUMNS = `
  id, slug, title, category, body, cover_url, cover_alt,
  keyword, video_url, summary, published_at`;

export function listPosts() {
  return query(`SELECT ${POST_COLUMNS} FROM posts ORDER BY published_at DESC`);
}

export async function findPostBySlug(slug) {
  const rows = await query(`SELECT ${POST_COLUMNS} FROM posts WHERE slug = $1`, [slug]);
  return rows[0] || null;
}

// --- Creating posts --------------------------------------------------------

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// A cover image is either a file on this site (/img/…) or an http(s) link.
// This stops values like "javascript:…" from ending up in an <img src>.
function isImageUrl(value) {
  if (value.startsWith('/img/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// Checks the form data sent from the browser. The server always checks,
// whatever the form in the browser did. Returns { values, errors }, where
// errors has one message per field that needs fixing.
export function validatePostInput(input) {
  const values = {
    title: cleanText(input.title),
    category: cleanText(input.category),
    body: cleanText(input.body),
    cover_url: cleanText(input.cover_url),
    cover_alt: cleanText(input.cover_alt),
    keyword: cleanText(input.keyword),
  };
  const errors = {};

  if (values.title.length < 3 || values.title.length > 120) {
    errors.title = 'Give the story a title (3–120 characters).';
  }
  if (!CATEGORIES.includes(values.category)) {
    errors.category = 'Choose Film, AI or Art.';
  }
  if (values.body.length < 100) {
    errors.body = 'Write at least 100 characters.';
  } else if (values.body.length > 20000) {
    errors.body = 'The text is too long (max 20,000 characters).';
  }
  if (!values.cover_url) {
    errors.cover_url = 'Add a cover image.';
  } else if (values.cover_url.length > 500 || !isImageUrl(values.cover_url)) {
    errors.cover_url = 'Use an image link that starts with https:// or /img/.';
  }
  if (values.cover_alt.length > 300) {
    errors.cover_alt = 'Keep the description under 300 characters.';
  }
  if (values.keyword.length < 2 || values.keyword.length > 60) {
    errors.keyword = 'Add a keyword (2–60 characters).';
  }

  return { values, errors };
}

// "Röktanke: a prompt!" → "roktanke-a-prompt"
export function slugify(title) {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ö → o, é → e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || 'post';
}

// Saves a new post and returns it. If the slug is already taken,
// tries "title-2", "title-3" and so on.
export async function createPost(values, authorId) {
  const baseSlug = slugify(values.title);

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const slug = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
    const rows = await query(
      `INSERT INTO posts (slug, title, category, body, cover_url, cover_alt, keyword, summary, author_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (slug) DO NOTHING
       RETURNING ${POST_COLUMNS}`,
      [
        slug,
        values.title,
        values.category,
        values.body,
        values.cover_url,
        values.cover_alt || null,
        values.keyword,
        values.summary || null,
        authorId,
      ],
    );
    if (rows.length > 0) return rows[0];
  }
  throw new Error(`No free slug found for "${baseSlug}"`);
}
