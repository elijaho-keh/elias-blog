// GET /api/posts → every post, newest first.
import { allowMethods, serverError } from '../lib/http.js';
import { listPosts } from '../lib/posts.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  try {
    const posts = await listPosts();
    res.status(200).json({ posts });
  } catch (error) {
    serverError(res, error);
  }
}
