// POST /api/login  { "username": "…", "password": "…" }
// Checks the password and starts a session (sets the session cookie).
import bcrypt from 'bcryptjs';
import { startSession } from '../lib/auth.js';
import { query } from '../lib/db.js';
import { allowMethods, readJsonBody, serverError } from '../lib/http.js';

// A bcrypt hash of a throwaway string. When the username doesn't exist we
// still compare against this, so a wrong username takes as long as a wrong
// password and the response time doesn't reveal which usernames exist.
const DUMMY_HASH = '$2b$12$1CKF5LPt0yVMv8k8xMiVW.6.oOLkWkSZgEMYI2KM4X.BWOD/.Nhb2';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password || username.length > 100 || password.length > 200) {
    res.status(400).json({ error: 'Enter your username and password.' });
    return;
  }

  try {
    const [user] = await query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username],
    );
    const passwordMatches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    // Same message for a wrong username and a wrong password
    if (!user || !passwordMatches) {
      res.status(401).json({ error: 'Wrong username or password.' });
      return;
    }

    // Housekeeping: remove sessions that have run out
    await query('DELETE FROM sessions WHERE expires_at < now()');
    await startSession(req, res, user.id);
    res.status(200).json({ user: { username: user.username } });
  } catch (error) {
    serverError(res, error);
  }
}
