// The post page: reads ?slug= from the URL and renders that post.
import { getPost } from './api.js';
import { el, formatDate, readingTime, toParagraphs } from './lib.js';

const container = document.querySelector('#post');
const status = document.querySelector('#post-status');

function renderBody(text) {
  const paragraphs = toParagraphs(text).map((paragraph) => {
    // A last paragraph starting with "Credits:" gets the small credits style
    const isCredits = paragraph.startsWith('Credits:');
    return el('p', { class: isCredits ? 'credits' : null, text: paragraph });
  });
  return el('div', { class: 'prose' }, paragraphs);
}

function renderVideo(post) {
  if (!post.video_url) return null;

  const video = el('video', {
    controls: '',
    preload: 'none',
    playsinline: '',
    poster: post.cover_url,
  }, [
    el('source', { src: post.video_url, type: 'video/mp4' }),
  ]);

  return el('section', { class: 'post-section post-section--wide', 'aria-labelledby': 'watch-heading' }, [
    el('h2', { class: 'label post-section__label', id: 'watch-heading', text: 'Watch' }),
    video,
  ]);
}

function renderPost(post) {
  document.title = `${post.title} — Dailies`;

  const header = el('header', { class: 'post__header' }, [
    el('p', { class: 'meta' }, [
      el('span', { class: 'tag', text: post.category }),
      el('time', { datetime: post.published_at, text: formatDate(post.published_at) }),
      el('span', { text: `${readingTime(post.body)} min read` }),
    ]),
    el('h1', { class: 'post__title', text: post.title }),
    el('p', { class: 'post__byline', text: 'By Elias Grünewald Dykert' }),
  ]);

  const cover = el('figure', { class: 'post__cover' }, [
    el('img', { src: post.cover_url, alt: post.cover_alt || '' }),
  ]);

  const end = el('nav', { class: 'post__end', 'aria-label': 'Back' }, [
    el('a', { class: 'back', href: '/', text: '← Back to all stories' }),
  ]);

  const parts = [header, cover, renderBody(post.body), renderVideo(post), end];
  container.append(...parts.filter(Boolean));
}

function showError(message) {
  document.title = 'Story not found — Dailies';
  status.textContent = message;
  status.classList.add('status--error');
}

async function init() {
  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    showError('No story was chosen.');
    return;
  }

  try {
    const post = await getPost(slug);
    if (!post) {
      showError('That story could not be found.');
      return;
    }
    status.textContent = '';
    renderPost(post);
  } catch (error) {
    console.error(error);
    showError('The story could not be loaded. Please try again in a moment.');
  }
}

init();
