// POST /api/logout → deletes the session and clears the cookie.
// POST, not GET, so a link or image on another site can't log you out.
import { endSession } from '../lib/auth.js';
import { allowMethods, serverError } from '../lib/http.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    await endSession(req, res);
    res.status(200).json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
}
