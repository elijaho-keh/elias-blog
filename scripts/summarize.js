// Adds AI summaries to posts that don't have one yet.
// Run: npm run ai:summaries                 posts without a summary
//      npm run ai:summaries -- --all        redo every post
//      npm run ai:summaries -- --dry-run    show summaries without saving
// Try another model for one run:
//      OPENROUTER_MODEL=google/gemini-2.5-flash-lite npm run ai:summaries -- --all --dry-run
import { DEFAULT_MODEL, summarize } from '../lib/ai.js';
import { query } from '../lib/db.js';
import { updateSummary } from '../lib/posts.js';

if (!process.env.OPENROUTER_API_KEY) {
  console.error('Add OPENROUTER_API_KEY to .env first.');
  process.exit(1);
}

const redoAll = process.argv.includes('--all');
const dryRun = process.argv.includes('--dry-run');

const posts = await query(
  `SELECT id, slug, body FROM posts
   ${redoAll ? '' : 'WHERE summary IS NULL'}
   ORDER BY published_at`,
);
console.log(`Model: ${process.env.OPENROUTER_MODEL || DEFAULT_MODEL}`);
console.log(`Posts to summarize: ${posts.length}${dryRun ? ' (dry run, nothing is saved)' : ''}\n`);

let failed = 0;
for (const post of posts) {
  const started = Date.now();
  try {
    const summary = await summarize(post.body);
    if (!dryRun) await updateSummary(post.id, summary);
    console.log(`✓ ${post.slug} (${Date.now() - started} ms)\n  ${summary}\n`);
  } catch (error) {
    failed += 1;
    console.log(`✗ ${post.slug}: ${error.message}\n`);
  }
}

console.log(`Done: ${posts.length - failed} summarized, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
