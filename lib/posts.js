// Database queries for posts, shared by the functions in /api.
import { query } from './db.js';

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
