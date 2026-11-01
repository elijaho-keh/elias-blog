// Everything the pages need from the server goes through this file.
// The pages never call fetch() themselves, so if an endpoint changes,
// only this file has to change.

// Sends a request to our own API and returns the JSON answer. Throws if the
// server answers with an error, with the HTTP status on error.status.
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
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
