// Fills the database with the admin account and the seed posts.
// Run: npm run db:seed
// Safe to run again: existing rows are updated, never duplicated.
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { query, transaction } from '../lib/db.js';

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD in .env first.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('ADMIN_PASSWORD must be at least 12 characters long.');
  process.exit(1);
}

// 1. The admin account. bcrypt stores a salted hash, never the password itself.
const passwordHash = await bcrypt.hash(password, 12);
const [admin] = await query(
  `INSERT INTO users (username, password_hash)
   VALUES ($1, $2)
   ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
   RETURNING id`,
  [username, passwordHash],
);

// Running the seed again may change the password, so log out every
// existing session for this account.
await query('DELETE FROM sessions WHERE user_id = $1', [admin.id]);
console.log(`Admin account ready (user id ${admin.id}).`);

// 2. The seed posts. On a re-run the text is updated, but an existing
// AI summary is kept.
const posts = JSON.parse(
  await readFile(new URL('../public/data/posts.json', import.meta.url), 'utf8'),
);

await transaction(
  posts.map((post) => [
    `INSERT INTO posts
       (slug, title, category, body, cover_url, cover_alt, keyword, video_url, author_id, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (slug) DO UPDATE SET
       title = EXCLUDED.title,
       category = EXCLUDED.category,
       body = EXCLUDED.body,
       cover_url = EXCLUDED.cover_url,
       cover_alt = EXCLUDED.cover_alt,
       keyword = EXCLUDED.keyword,
       video_url = EXCLUDED.video_url,
       published_at = EXCLUDED.published_at`,
    [
      post.slug,
      post.title,
      post.category,
      post.body,
      post.cover_url,
      post.cover_alt,
      post.keyword,
      post.video_url,
      admin.id,
      post.published_at,
    ],
  ]),
);
console.log(`Seed posts ready: ${posts.length}.`);
