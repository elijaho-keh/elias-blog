// Health check: can we reach the database, and what's in it?
// Run: npm run db:check
import { query } from '../lib/db.js';

const [server] = await query('SELECT current_database() AS database, version()');
console.log(`Connected to "${server.database}" (${server.version.split(' on ')[0]})`);

const [counts] = await query(
  `SELECT (SELECT count(*) FROM users)::int    AS users,
          (SELECT count(*) FROM posts)::int    AS posts,
          (SELECT count(*) FROM comments)::int AS comments,
          (SELECT count(*) FROM sessions)::int AS sessions`,
);
console.log('Rows:', counts);

const categories = await query(
  'SELECT category, count(*)::int AS posts FROM posts GROUP BY category ORDER BY category',
);
console.log('Posts per category:', Object.fromEntries(categories.map((row) => [row.category, row.posts])));

const newest = await query(
  'SELECT title, published_at FROM posts ORDER BY published_at DESC LIMIT $1',
  [3],
);
console.log('Newest posts:');
for (const post of newest) {
  console.log(`  ${post.published_at.toISOString().slice(0, 10)}  ${post.title}`);
}
