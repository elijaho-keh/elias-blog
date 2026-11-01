// Everything the pages need from the server goes through this file.
// The pages never call fetch() themselves, so if an endpoint changes,
// only this file has to change.

// Sends a request to our own API and returns the JSON answer. Throws if the
// server answers with an error, with the HTTP status on error.status and
// any per-field messages on error.fields.
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.fields = data.fields || {};
    throw error;
  }
  return data;
}

function postJson(url, body) {
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// --- Posts ---------------------------------------------------------------

// All posts, newest first (the server sorts them)
export async function getPosts() {
  const data = await request('/api/posts');
  return data.posts;
}

// One post, or null if there's no post with that slug
export async function getPost(slug) {
  try {
    const data = await request(`/api/post?slug=${encodeURIComponent(slug)}`);
    return data.post;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

// Saves a new post (logged in only) and returns it
export async function createPost(fields) {
  const data = await postJson('/api/posts', fields);
  return data.post;
}

// --- Comments ------------------------------------------------------------

// The comments on one post, oldest first
export async function getComments(slug) {
  const data = await request(`/api/comments?post=${encodeURIComponent(slug)}`);
  return data.comments;
}

// Adds a comment and returns it as saved by the server
export async function addComment(slug, { name, body, website }) {
  const data = await postJson('/api/comments', { post: slug, name, body, website });
  return data.comment;
}

// --- Kindred work ----------------------------------------------------------

// An artwork from the Art Institute of Chicago matching the keyword, or null.
// Our own server asks the museum (see api/kindred.js).
export async function getKindredWork(keyword) {
  const data = await request(`/api/kindred?q=${encodeURIComponent(keyword)}`);
  return data.artwork;
}

// --- Login ---------------------------------------------------------------

// The logged-in user ({ username }), or null
export async function getCurrentUser() {
  const data = await request('/api/me');
  return data.user;
}

export async function login(username, password) {
  const data = await postJson('/api/login', { username, password });
  return data.user;
}

export function logout() {
  return postJson('/api/logout', {});
}
