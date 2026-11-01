// Database queries and checks for comments, shared by api/comments.js.
import { query } from './db.js';

const COMMENT_COLUMNS = 'id, name, body, created_at';

// Oldest first, so the comments read like a conversation
export function listComments(postId) {
  return query(
    `SELECT ${COMMENT_COLUMNS} FROM comments WHERE post_id = $1 ORDER BY created_at ASC, id ASC`,
    [postId],
  );
}

export async function createComment(postId, values) {
  const rows = await query(
    `INSERT INTO comments (post_id, name, body)
     VALUES ($1, $2, $3)
     RETURNING ${COMMENT_COLUMNS}`,
    [postId, values.name, values.body],
  );
  return rows[0];
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Checks a comment from a visitor. Returns { values, errors }, where errors
// has one message per field that needs fixing.
export function validateCommentInput(input) {
  const values = {
    post: cleanText(input.post),
    name: cleanText(input.name),
    // Windows line endings → \n, and at most one empty line in a row
    body: cleanText(input.body).replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n'),
    // The "website" field is hidden from people. Only bots fill it in.
    website: cleanText(input.website),
  };
  const errors = {};

  if (!values.name) {
    errors.name = 'Add your name.';
  } else if (values.name.length > 60) {
    errors.name = 'Keep your name under 60 characters.';
  }
  if (!values.body) {
    errors.body = 'Write a comment.';
  } else if (values.body.length > 2000) {
    errors.body = 'Keep the comment under 2,000 characters.';
  }

  return { values, errors };
}
