// Small helpers shared by every page.

// Creates an element. Text always goes in through textContent, never
// innerHTML, so text from posts or comments can't inject HTML.
// Example: el('a', { href: '/', text: 'Home' }) → <a href="/">Home</a>
export function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);

  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;

    if (name === 'text') {
      node.textContent = value;
    } else if (name === 'class') {
      node.className = value;
    } else {
      node.setAttribute(name, value);
    }
  }

  node.append(...children.filter(Boolean));
  return node;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatDate(isoDate) {
  return dateFormat.format(new Date(isoDate));
}

export function countWords(text) {
  return text.trim().split(/\s+/).length;
}

// About 200 words per minute, never less than one minute
export function readingTime(text) {
  return Math.max(1, Math.round(countWords(text) / 200));
}

// Post bodies are plain text, with a blank line between paragraphs
export function toParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
}

// The first words of a text, used when a post has no AI summary yet
export function excerpt(text, maxWords = 32) {
  const words = toParagraphs(text)[0].split(/\s+/);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ') + '…';
}

export function postUrl(slug) {
  return `/post.html?slug=${encodeURIComponent(slug)}`;
}
