// Everything the pages need from the server goes through this file.
// The pages never call fetch() themselves, so if an endpoint changes,
// only this file has to change.

// Fetches JSON from our own API. Throws if the server answers with an error,
// so callers can show an error message.
async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

// All posts, newest first (the server sorts them)
export async function getPosts() {
  const data = await getJson('/api/posts');
  return data.posts;
}

// One post, or null if there's no post with that slug
export async function getPost(slug) {
  try {
    const data = await getJson(`/api/post?slug=${encodeURIComponent(slug)}`);
    return data.post;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}
