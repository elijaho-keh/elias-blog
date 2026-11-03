// GET    /api/post?slug=flora → one post, or 404 if there's no post with that slug.
// DELETE /api/post?slug=flora → deletes the post. Only for its logged-in author.
import { requireUser } from '../lib/auth.js';
import { allowMethods, serverError } from '../lib/http.js';
import { deletePost, findPostBySlug } from '../lib/posts.js';

async function show(res, slug) {
  const post = await findPostBySlug(slug);
  if (!post) {
    res.status(404).json({ error: 'Post not found.' });
    return;
  }
  res.status(200).json({ post });
}

async function remove(req, res, slug) {
  const user = await requireUser(req, res);
  if (!user) return;

  const deleted = await deletePost(slug, user.id);
  if (!deleted) {
    res.status(404).json({ error: 'Post not found.' });
    return;
  }
  res.status(200).json({ deleted: slug });
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'DELETE'])) return;

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) {
    res.status(400).json({ error: 'Add ?slug= to choose a post.' });
    return;
  }

  try {
    if (req.method === 'DELETE') {
      await remove(req, res, slug);
    } else {
      await show(res, slug);
    }
  } catch (error) {
    serverError(res, error);
  }
}
