// GET  /api/comments?post=flora → the comments on one post, oldest first.
// POST /api/comments { post, name, body } → adds a comment. No login needed.
import { createComment, listComments, validateCommentInput } from '../lib/comments.js';
import { allowMethods, readJsonBody, serverError } from '../lib/http.js';
import { findPostBySlug } from '../lib/posts.js';

async function list(req, res) {
  const slug = typeof req.query.post === 'string' ? req.query.post.trim() : '';
  const post = slug ? await findPostBySlug(slug) : null;
  if (!post) {
    res.status(404).json({ error: 'Post not found.' });
    return;
  }

  const comments = await listComments(post.id);
  res.status(200).json({ comments });
}

async function create(req, res) {
  const body = readJsonBody(req, res);
  if (!body) return;

  const { values, errors } = validateCommentInput(body);

  // A filled-in hidden field means a bot, not a person
  if (values.website) {
    res.status(400).json({ error: 'The comment could not be posted.' });
    return;
  }
  if (Object.keys(errors).length > 0) {
    res.status(400).json({ error: 'Please fix the marked fields.', fields: errors });
    return;
  }

  const post = await findPostBySlug(values.post);
  if (!post) {
    res.status(404).json({ error: 'Post not found.' });
    return;
  }

  const comment = await createComment(post.id, values);
  res.status(201).json({ comment });
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  try {
    if (req.method === 'POST') {
      await create(req, res);
    } else {
      await list(req, res);
    }
  } catch (error) {
    serverError(res, error);
  }
}
