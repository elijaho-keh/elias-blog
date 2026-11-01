// GET /api/post?slug=flora → one post, or 404 if there's no post with that slug.
import { allowMethods, serverError } from '../lib/http.js';
import { findPostBySlug } from '../lib/posts.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) {
    res.status(400).json({ error: 'Add ?slug= to choose a post.' });
    return;
  }

  try {
    const post = await findPostBySlug(slug);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    res.status(200).json({ post });
  } catch (error) {
    serverError(res, error);
  }
}
