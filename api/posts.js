// GET  /api/posts → every post, newest first.
// POST /api/posts → creates a post. Only for the logged-in author:
//                   the server checks the session cookie itself.
import { trySummarize } from '../lib/ai.js';
import { requireUser } from '../lib/auth.js';
import { allowMethods, readJsonBody, serverError } from '../lib/http.js';
import { createPost, listPosts, updateSummary, validatePostInput } from '../lib/posts.js';

async function list(req, res) {
  const posts = await listPosts();
  res.status(200).json({ posts });
}

async function create(req, res) {
  // 1. Who is asking? Answers 401 if nobody is logged in.
  const user = await requireUser(req, res);
  if (!user) return;

  // 2. Is the data complete and sensible?
  const body = readJsonBody(req, res);
  if (!body) return;

  const { values, errors } = validatePostInput(body);
  if (Object.keys(errors).length > 0) {
    res.status(400).json({ error: 'Please fix the marked fields.', fields: errors });
    return;
  }

  // 3. Save it. This happens before the AI is asked, so the post is saved
  //    even if the AI is slow, down or out of credit.
  const post = await createPost(values, user.id);

  // 4. Ask the AI for a two-sentence summary (null if that fails)
  const summary = await trySummarize(post.body);
  if (summary) {
    await updateSummary(post.id, summary);
    post.summary = summary;
  }

  res.status(201).json({ post });
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
