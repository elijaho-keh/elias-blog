// The comments section at the bottom of a post.
// Names and comments come from visitors, so they are only ever shown with
// textContent (through el()), never as HTML.
import { addComment, getComments } from './api.js';
import { el, formatDate } from './lib.js';

const MAX_LENGTH = 2000;

const section = document.querySelector('#comments');
const heading = document.querySelector('#comments-heading');
const status = document.querySelector('#comments-status');
const list = document.querySelector('#comment-list');
const form = document.querySelector('#comment-form');
const formError = document.querySelector('#comment-error');
const submitButton = form.querySelector('button[type="submit"]');
const counter = document.querySelector('#comment-body-count');

let comments = [];

function renderComment(comment) {
  return el('li', { class: 'comment' }, [
    el('p', { class: 'comment__meta' }, [
      el('span', { class: 'comment__name', text: comment.name }),
      el('time', { datetime: comment.created_at, text: formatDate(comment.created_at) }),
    ]),
    el('p', { class: 'comment__body', text: comment.body }),
  ]);
}

function renderList() {
  list.replaceChildren(...comments.map(renderComment));
  heading.textContent = comments.length > 0 ? `Comments (${comments.length})` : 'Comments';
  status.textContent = comments.length > 0 ? '' : 'No comments yet. Be the first.';
}

function showFieldErrors(errors) {
  const fields = { name: form.elements.name, body: form.elements.body };
  for (const [key, input] of Object.entries(fields)) {
    const message = errors[key] || '';
    document.querySelector(`#comment-${key}-error`).textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  if (errors.name) form.elements.name.focus();
  else if (errors.body) form.elements.body.focus();
}

function updateCounter() {
  counter.textContent = `${form.elements.body.value.length} / ${MAX_LENGTH}`;
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? 'Posting…' : 'Post comment';
}

async function handleSubmit(slug, event) {
  event.preventDefault();
  formError.textContent = '';

  const fields = {
    name: form.elements.name.value.trim(),
    body: form.elements.body.value.trim(),
    website: form.elements.website.value,
  };

  // Quick check before bothering the server. The server checks again.
  const errors = {};
  if (fields.name === '') errors.name = 'Add your name.';
  if (fields.body === '') errors.body = 'Write a comment.';
  showFieldErrors(errors);
  if (Object.keys(errors).length > 0) return;

  setBusy(true);
  try {
    const comment = await addComment(slug, fields);
    comments.push(comment);
    renderList();
    form.elements.body.value = '';
    updateCounter();
    status.textContent = 'Thanks! Your comment is posted.';
    list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    if (error.status === 400 && Object.keys(error.fields).length > 0) {
      showFieldErrors(error.fields);
    } else {
      formError.textContent = 'Your comment could not be posted. Please try again.';
    }
  } finally {
    setBusy(false);
  }
}

export async function initComments(slug) {
  section.hidden = false;
  form.addEventListener('submit', (event) => handleSubmit(slug, event));
  form.elements.body.addEventListener('input', updateCounter);

  try {
    comments = await getComments(slug);
    renderList();
  } catch (error) {
    console.error(error);
    status.textContent = 'The comments could not be loaded.';
  }
}
