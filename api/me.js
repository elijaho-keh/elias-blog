// GET /api/me → { user: { username } } when logged in, { user: null } otherwise.
import { getSessionUser } from '../lib/auth.js';
import { allowMethods, serverError } from '../lib/http.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  // The answer depends on the cookie, so it must never be cached
  res.setHeader('Cache-Control', 'no-store');

  try {
    const user = await getSessionUser(req);
    res.status(200).json({ user: user ? { username: user.username } : null });
  } catch (error) {
    serverError(res, error);
  }
}
