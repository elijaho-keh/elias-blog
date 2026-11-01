// Login sessions. They're stored in the sessions table, not in server
// memory, because each serverless function call may run on a fresh instance.
import { createHash, randomBytes } from 'node:crypto';
import { query } from './db.js';

const COOKIE_NAME = 'session';
const SESSION_DAYS = 7;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

// The cookie holds a random token. The database only stores its SHA-256
// hash, so someone who reads the database still can't log in.
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function isLocalhost(req) {
  const host = req.headers.host || '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

function sessionCookie(req, value, maxAgeSeconds) {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly', // JavaScript in the page can't read it
    'SameSite=Strict', // never sent along with requests that start on another site
    `Max-Age=${maxAgeSeconds}`,
  ];
  // Secure: only sent over HTTPS. Left out on localhost, which runs on plain HTTP.
  if (!isLocalhost(req)) parts.push('Secure');
  return parts.join('; ');
}

// Creates a session for the user and sets the cookie on the response
export async function startSession(req, res, userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);

  await query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, expiresAt.toISOString()],
  );
  res.setHeader('Set-Cookie', sessionCookie(req, token, SESSION_SECONDS));
}

// The logged-in user ({ id, username }), or null
export async function getSessionUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;

  const rows = await query(
    `SELECT users.id, users.username
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] || null;
}

// Deletes the session from the database and clears the cookie
export async function endSession(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
  }
  res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
}

// For functions that only a logged-in user may use. Answers 401 and
// returns null when nobody is logged in, so a handler can do:
//   const user = await requireUser(req, res);
//   if (!user) return;
export async function requireUser(req, res) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'You need to log in first.' });
    return null;
  }
  return user;
}
