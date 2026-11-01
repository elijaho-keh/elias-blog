// GET /api/kindred?q=neon → { artwork: {…} } or { artwork: null }
// Asks the Art Institute of Chicago on the visitor's behalf. Vercel's CDN
// keeps each answer for a day, so the museum gets about one request per
// keyword per day, however many people read the post.
import { allowMethods } from '../lib/http.js';
import { findKindredWork } from '../lib/kindred.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  const keyword = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (keyword.length < 2 || keyword.length > 60) {
    res.status(400).json({ error: 'Add a keyword of 2–60 characters as ?q=' });
    return;
  }

  try {
    const artwork = await findKindredWork(keyword);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ artwork });
  } catch (error) {
    console.error('Kindred work:', error.message);
    // Don't cache failures, so the next visitor gets a fresh try
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'The Art Institute of Chicago could not be reached.' });
  }
}
