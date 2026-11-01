// Everything the pages need from the server goes through this file.
// For now the posts come from a static JSON file. When the database is
// connected, only these functions change; the pages stay the same.

export async function getPosts() {
  const response = await fetch('/data/posts.json');
  if (!response.ok) throw new Error(`Could not load posts (${response.status})`);

  const posts = await response.json();
  // Newest first
  return posts.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
}

export async function getPost(slug) {
  const posts = await getPosts();
  return posts.find((post) => post.slug === slug) || null;
}
